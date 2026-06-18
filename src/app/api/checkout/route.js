import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // A forma segura de validar no servidor no Supabase novo
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let { cpf, plano, whatsapp } = body;

    if (plano && plano !== 'essencial' && plano !== 'completo') {
      return new Response(JSON.stringify({ error: 'Plano inválido selecionado.' }), { status: 400 });
    }

    // Definição dos Preços Base
    let valorAssinatura = 0;
    if (plano === 'completo') {
      valorAssinatura = 39.00;
    } else {
      valorAssinatura = 29.00; // default é o Essencial
      plano = 'essencial'; // Normaliza
    }

    const email = user.email;
    const ASAAS_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    const ASAAS_KEY = process.env.ASAAS_API_KEY;

    if (!ASAAS_KEY) {
      return new Response(JSON.stringify({ error: 'Chave do Asaas não configurada' }), { status: 500 });
    }

    // 1. Buscar usuário no BD para ver se já tem asaas_customer_id, documento e whatsapp
    const { data: dbUser } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
    let customerId = dbUser?.asaas_customer_id;

    if (!cpf && dbUser?.documento) cpf = dbUser.documento;
    if (!whatsapp && dbUser?.whatsapp) whatsapp = dbUser.whatsapp;

    if (!cpf) {
      return new Response(JSON.stringify({ error: 'CPF é obrigatório para assinar' }), { status: 400 });
    }

    if (!whatsapp) {
      return new Response(JSON.stringify({ error: 'WhatsApp é obrigatório para contato' }), { status: 400 });
    }

    // 2. Cria ou Atualiza o Cliente no Asaas com o CPF
    if (!customerId) {
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_KEY
        },
        body: JSON.stringify({
          name: user.user_metadata?.full_name || email,
          email: email,
          cpfCnpj: cpf,
          mobilePhone: whatsapp
        })
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) throw new Error(customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
      
      customerId = customerData.id;

      // Salvar no Supabase (usando Service Role puro)
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabaseAdmin.from('usuarios').upsert({ 
        id: user.id,
        nome_completo: user.user_metadata?.full_name || email,
        asaas_customer_id: customerId,
        documento: cpf,
        whatsapp: whatsapp
      }, { onConflict: 'id' });
    } else {
      // O cliente já existe no Asaas (foi criado nos testes anteriores sem CPF). Vamos atualizá-lo!
      const updateRes = await fetch(`${ASAAS_URL}/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_KEY
        },
        body: JSON.stringify({
          cpfCnpj: cpf,
          mobilePhone: whatsapp
        })
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.errors?.[0]?.description || 'Erro ao atualizar CPF do cliente no Asaas');

      // E se o cliente já existia, talvez ainda não tivesse WhatsApp salvo no Supabase, então salva também:
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await supabaseAdmin.from('usuarios').upsert({
        id: user.id,
        nome_completo: user.user_metadata?.full_name || email,
        documento: cpf,
        whatsapp: whatsapp
      }, { onConflict: 'id' });
    }

    // 3. Criar uma Assinatura no Asaas
    const subRes = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_KEY
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite o usuário escolher Pix, Cartão ou Boleto
        value: valorAssinatura,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Começa amanhã ou hoje
        cycle: 'MONTHLY',
        description: `Assinatura OdontoConforme - Plano ${plano === 'completo' ? 'Completo' : 'Essencial'}`
      })
    });

    const subData = await subRes.json();
    if (!subRes.ok) throw new Error(subData.errors?.[0]?.description || 'Erro ao criar assinatura');

    // 4. A assinatura no Asaas não retorna o Link direto, precisamos pegar a primeira cobrança gerada por ela
    const paymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${subData.id}`, {
      headers: {
        'access_token': ASAAS_KEY
      }
    });
    const paymentsData = await paymentsRes.json();
    const invoiceUrl = paymentsData.data?.[0]?.invoiceUrl || paymentsData.data?.[0]?.bankSlipUrl;

    if (!invoiceUrl) {
      throw new Error('Assinatura criada, mas não foi possível recuperar o link de pagamento.');
    }

    // Retorna o link de pagamento do Asaas
    return new Response(JSON.stringify({ checkoutUrl: invoiceUrl }), { status: 200 });

  } catch (error) {
    console.error('Erro no Checkout Asaas:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), { status: 500 });
  }
}
