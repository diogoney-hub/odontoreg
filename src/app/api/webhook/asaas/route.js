import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    console.log('[Webhook Asaas] Recebendo nova requisição do Asaas...');
    // REGRA 8: Validação de Token do Webhook
    // O Asaas envia o header asaas-access-token. Sem ele, rejeitamos a requisição por segurança.
    const asaasToken = request.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN; // Deve ser cadastrado no .env.local

    // O token de webhook é obrigatório por segurança. Se não estiver configurado, retorna 500.
    if (!expectedToken) {
      console.error('[Webhook Asaas] Erro crítico: ASAAS_WEBHOOK_TOKEN não está configurado no ambiente.');
      return new Response(JSON.stringify({ error: 'Erro interno de configuração do servidor' }), { status: 500 });
    }

    if (asaasToken !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Token de webhook inválido' }), { status: 401 });
    }

    const payload = await request.json();
    const event = payload.event;
    const payment = payload.payment;
    const eventId = payload.id; // ID único do evento gerado pelo Asaas

    if (!payment || !payment.customer) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 });
    }

    const customerId = payment.customer;

    // Criando o client do Supabase com a Service Role Key (ignora o RLS, exclusivo do backend)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // REGRA 9: Idempotência
    // Verificamos se o evento exato (eventId) já foi processado na tabela eventos_assinatura
    const { data: existingEvent } = await supabase
      .from('eventos_assinatura')
      .select('id')
      .eq('origem', `webhook_${eventId}`)
      .single();

    if (existingEvent) {
      return new Response(JSON.stringify({ message: 'Evento já processado (Idempotência)' }), { status: 200 });
    }

    // Identificar o usuário no banco pelo Asaas Customer ID
    const { data: dbUser } = await supabase
      .from('usuarios')
      .select('id, status_assinatura')
      .eq('asaas_customer_id', customerId)
      .single();

    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404 });
    }

    const userId = dbUser.id;
    const oldStatus = dbUser.status_assinatura;
    let newStatus = oldStatus;

    // Identificar o plano pago através da descrição ou do valor
    let planoInferido = oldStatus || 'essencial'; // fallback
    if (payment.value == 39.00 || (payment.description && payment.description.toLowerCase().includes('completo'))) {
      planoInferido = 'completo';
    } else if (payment.value == 29.00 || (payment.description && payment.description.toLowerCase().includes('essencial'))) {
      planoInferido = 'essencial';
    }

    // REGRA 10: Regra de Ouro do Acesso
    // Somente pagamentos CONFIRMADOS/RECEBIDOS atualizam para 'ativo'
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      newStatus = 'ativo';
    } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      newStatus = 'pagamento_pendente';
    }

    // 1. Gravar/Atualizar a fatura na tabela 'pagamentos'
    // Usa upsert pelo 'asaas_payment_id' (único)
    const { error: pagError } = await supabase.from('pagamentos').upsert({
      usuario_id: userId,
      asaas_payment_id: payment.id,
      valor: payment.value,
      status: payment.status,
      metodo: payment.billingType,
      data_vencimento: payment.dueDate,
      data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
      plano: planoInferido // Grava o plano na fatura
    }, { onConflict: 'asaas_payment_id' });
    if (pagError) throw new Error('Erro ao salvar pagamento no banco: ' + pagError.message);

    // 2. Gravar o evento em 'eventos_assinatura' (garantindo que se o mesmo evento chegar, a idempotência barrará)
    const { error: evtError } = await supabase.from('eventos_assinatura').insert({
      usuario_id: userId,
      tipo_evento: event,
      origem: `webhook_${eventId}`, // chave de idempotência
      plano_anterior: dbUser.plano_atual || oldStatus,
      plano_novo: planoInferido
    });
    if (evtError) throw new Error('Erro ao salvar o log do evento: ' + evtError.message);

    // 3. Finalmente, atualizar o status principal de liberação de acesso do usuário e seu plano_atual
    if (oldStatus !== newStatus || dbUser.plano_atual !== planoInferido) {
      const { error: updError } = await supabase
        .from('usuarios')
        .update({ status_assinatura: newStatus, plano_atual: planoInferido })
        .eq('id', userId);
      if (updError) throw new Error('Erro ao atualizar status e plano do usuário: ' + updError.message);
    }
    
    console.log(`[Webhook Asaas] Sucesso! Evento ${event} processado. Status de ${dbUser.id} agora é ${newStatus} no plano ${planoInferido}.`);

    return new Response(JSON.stringify({ success: true, status: newStatus, plano: planoInferido }), { status: 200 });

  } catch (error) {
    console.error('Erro no Webhook Asaas:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
}
