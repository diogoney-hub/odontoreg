import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(
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
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const userId = user.id;

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

    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404 });
    }

    if (dbUser.status_assinatura === 'trial') {
      // Para usuários em período de teste (trial), cancelamos apenas localmente no Supabase
      await supabase
        .from('usuarios')
        .update({ status_assinatura: 'cancelado' })
        .eq('id', userId);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!dbUser.asaas_customer_id) {
      return new Response(JSON.stringify({ error: 'Assinatura ativa não encontrada (ID Asaas ausente)' }), { status: 400 });
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
    
    if (!getSubRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao consultar assinaturas no Asaas' }), { status: 502 });
    }
    
    const getSubData = await getSubRes.json();
    
    // 3. Cancela todas as assinaturas ativas encontradas no Asaas
    if (!getSubData.data || getSubData.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma assinatura ativa encontrada no Asaas para este usuário' }), { status: 404 });
    }

    for (const subscription of getSubData.data) {
      const delRes = await fetch(`${ASAAS_URL}/subscriptions/${subscription.id}`, {
        method: 'DELETE',
        headers: { 'access_token': ASAAS_KEY }
      });

      if (!delRes.ok) {
        return new Response(JSON.stringify({ error: `Falha ao cancelar assinatura ${subscription.id} no Asaas` }), { status: 502 });
      }
    }

    // 4. Atualiza o status no Supabase apenas após confirmar a exclusão de todas as assinaturas no Asaas
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
