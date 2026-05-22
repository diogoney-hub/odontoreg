export default async function handler(req, res) {
  // Apenas permite requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Usa a chave que está configurada nas variáveis de ambiente da Vercel
  // Note que aqui ela se chama apenas GEMINI_API_KEY (sem VITE_)
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'A chave da API não está configurada no servidor.' });
  }

  try {
    const { userQueryText, currentAttachment, systemPrompt } = req.body;

    const parts = [{ text: userQueryText }];
    
    if (currentAttachment) {
      // Pega apenas a base64 sem o prefixo data:image/...
      const base64Data = currentAttachment.base64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: currentAttachment.mimeType,
          data: base64Data
        }
      });
    }

    const payload = {
      contents: [{ role: 'user', parts: parts }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [{ googleSearch: {} }] 
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na API do Gemini:', data);
      return res.status(response.status).json({ error: 'Erro ao se comunicar com a inteligência artificial.', details: data });
    }

    // Retorna os dados com sucesso para o frontend
    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro interno na Serverless Function:', error);
    return res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
  }
}
