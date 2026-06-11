import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => null);
    const userId = payload?.userId; // O cliente passará o id pela rota para simplificar a auth, ou recuperamos via Bearer

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Usuário não informado' }), { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Busca o customer ID no banco
    const { data: dbUser } = await supabase
      .from('usuarios')
      .select('asaas_customer_id, status_assinatura')
      .eq('id', userId)
      .single();

    if (!dbUser || !dbUser.asaas_customer_id) {
      return new Response(JSON.stringify({ error: 'Assinatura não encontrada' }), { status: 404 });
    }

    const ASAAS_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    const ASAAS_KEY = process.env.ASAAS_API_KEY;

    if (!ASAAS_KEY) {
      return new Response(JSON.stringify({ error: 'Configuração do Asaas ausente' }), { status: 500 });
    }

    // 2. Busca assinaturas ativas do cliente no Asaas
    const getSubRes = await fetch(`${ASAAS_URL}/subscriptions?customer=${dbUser.asaas_customer_id}&status=ACTIVE`, {
      method: 'GET',
      headers: { 'access_token': ASAAS_KEY }
    });
    
    const getSubData = await getSubRes.json();
    
    // 3. Cancela a assinatura encontrada no Asaas
    if (getSubData.data && getSubData.data.length > 0) {
      const subscriptionId = getSubData.data[0].id;
      
      const delRes = await fetch(`${ASAAS_URL}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'access_token': ASAAS_KEY }
      });
      
      if (!delRes.ok) {
        throw new Error('Falha ao cancelar no Asaas');
      }
    }

    // 4. Atualiza o status no Supabase
    // O usuário continua com acesso até o fim do ciclo se quiséssemos, 
    // mas a regra 17 do cliente fala que atualizará o status.
    await supabase
      .from('usuarios')
      .update({ status_assinatura: 'cancelado' })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
}
