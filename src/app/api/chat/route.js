import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
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
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No key' }, { status: 500 });
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'A chave da API não está configurada no servidor.' }, 
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
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
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: dbUser } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados' }, { status: 404 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let limitDia = Infinity;
    let limitMes = Infinity;
    
    if (dbUser.status_assinatura === 'trial') {
        const trialEndDate = dbUser.trial_fim 
          ? new Date(dbUser.trial_fim) 
          : new Date(new Date(dbUser.criado_em).getTime() + 7 * 24 * 60 * 60 * 1000);
        if (new Date() > trialEndDate) {
          return NextResponse.json({ error: 'Seu período de teste gratuito de 7 dias chegou ao fim.' }, { status: 403 });
        }
        limitMes = 10;
    } else if (dbUser.status_assinatura === 'ativo') {
        const planoAtual = dbUser.plano_atual || 'essencial';
        if (planoAtual === 'essencial') {
           limitDia = 30; limitMes = 300;
        } else if (planoAtual === 'completo') {
           limitDia = 50; limitMes = 750;
        }
    } else {
        return NextResponse.json({ error: 'Sua assinatura está inativa ou pendente.' }, { status: 403 });
    }

    // REGRA 13: Validação atômica de limites usando RPC no Postgres para prevenir condições de corrida
    const limitDiaArg = limitDia === Infinity ? null : limitDia;
    const limitMesArg = limitMes === Infinity ? null : limitMes;

    const { data: wasIncremented, error: rpcError } = await supabase.rpc('incrementar_consultas', {
      user_id_arg: user.id,
      limit_dia_arg: limitDiaArg,
      limit_mes_arg: limitMesArg,
      today_arg: today
    });

    if (rpcError) {
      console.error('Erro ao processar limites de consultas via RPC:', rpcError.message, rpcError.details, rpcError.code);
      return NextResponse.json({ error: 'Erro ao processar cota de consultas.', details: rpcError.message }, { status: 500 });
    }

    if (!wasIncremented) {
      return NextResponse.json({ error: `Limite de consultas alcançado. Você excedeu sua cota diária ou mensal.` }, { status: 403 });
    }

    const body = await req.json();
    const { history = [], userQueryText, currentAttachment, systemPrompt, conselhoRegional } = body;

    // Atualiza o conselho regional se houver mudança
    if (conselhoRegional && dbUser.conselho_regional !== conselhoRegional) {
      await supabase.from('usuarios').update({ conselho_regional: conselhoRegional }).eq('id', user.id);
    }

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || '' }]
    }));

    const currentParts = [{ text: userQueryText }];
    
    if (currentAttachment) {
      const base64Data = currentAttachment.base64.split(',')[1];
      currentParts.push({
        inlineData: {
          mimeType: currentAttachment.mimeType,
          data: base64Data
        }
      });
    }

    contents.push({ role: 'user', parts: currentParts });

    const payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    if (!currentAttachment) {
      payload.tools = [{ googleSearch: {} }];
    }

    const modelName = currentAttachment ? 'gemini-2.5-flash' : 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na API do Gemini:', data);
      
      // Reverte o incremento no contador de consultas caso a API do Gemini falhe
      await supabase.rpc('decrementar_consultas', {
        user_id_arg: user.id,
        today_arg: today
      });

      return NextResponse.json(
        { error: 'Erro ao se comunicar com a inteligência artificial.', details: data }, 
        { status: 502 } 
      );
    }

    // Gravação da consulta no log de auditoria
    await supabase.from('consultas').insert({
      usuario_id: user.id,
      pergunta: userQueryText,
      categoria: 'chat',
      modelo: modelName,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro interno na API Route:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro inesperado no servidor.' },
      { status: 500 }
    );
  }
}
