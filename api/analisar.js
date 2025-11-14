// Este arquivo é api/analyze.js (Node.js)
// Ele roda no SERVIDOR da Vercel, não no navegador.

export default async function handler(req, res) {
  // 1. Pega os dados que o seu frontend (HTML) enviou
  const { evaluationPrompt, schema } = await req.body;

  // 2. Pega a chave secreta das Environment Variables da Vercel
  //    Isso é SEGURO. O usuário NUNCA vê essa chave.
  const apiKey = process.env.GOOGLE_API_KEY;

  // 3. Monta a URL da API do Google
  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  // 4. Monta o payload que o Google espera
  const payload = {
    contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  // 5. Tenta chamar a API do Google e retornar a resposta
  try {
    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Se o Google der erro, repassa o erro para o frontend
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    // Se der certo, repassa a resposta do Google para o frontend
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    // Se o nosso backend falhar
    return res.status(500).json({ error: 'Erro interno no servidor da Vercel' });
  }
}
