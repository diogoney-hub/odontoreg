import { NextResponse } from 'next/server';

export async function GET(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No key' }, { status: 500 });
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return NextResponse.json(data);
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
    const body = await req.json();
    const { history = [], userQueryText, currentAttachment, systemPrompt, mode } = body;

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || '' }]
    }));

    const currentParts = [{ text: userQueryText }];
    
    if (currentAttachment) {
      // Pega apenas o Base64 ignorando o cabeçalho 'data:image/png;base64,' ou 'data:application/pdf;base64,'
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

    // Só adiciona a pesquisa no Google se o modo não for explicitamente "fast-answer"
    // E desativa o Google Search se houver um anexo (PDF/Imagem), pois a API do Gemini pode rejeitar a combinação.
    if (mode !== 'fast-answer' && !currentAttachment) {
      payload.tools = [{ googleSearch: {} }];
    }

    // Se tiver anexo (imagem), usamos o gemini-2.5-flash que é nativamente multimodal
    // Caso contrário, usamos o gemini-flash-lite-latest que é o mais rápido
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
      return NextResponse.json(
        { error: 'Erro ao se comunicar com a inteligência artificial.', details: data }, 
        { status: 502 } 
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro interno na API Route:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro inesperado no servidor.', details: error.message, stack: error.stack }, 
      { status: 500 }
    );
  }
}
