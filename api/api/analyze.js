// Este é o ficheiro api/analyze.js (Node.js)
// Ele roda no SERVIDOR da Vercel.

export default async function handler(req, res) {
  // Verifica se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 1. Pega os dados que o seu frontend (HTML) enviou
    const { evaluationPrompt, schema } = req.body;

    if (!evaluationPrompt || !schema) {
      return res.status(400).json({ error: 'Faltam dados no pedido (prompt ou schema)' });
    }

    // 2. Pega a sua chave secreta da Vercel.
    //    Estou a usar 'API_KEY' como você disse que configurou.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      // Este erro aparecerá nos logs da Vercel
      console.error("Erro: A variável de ambiente API_KEY não foi encontrada.");
      return res.status(500).json({ error: 'Chave de API não configurada no servidor' });
    }

    // 3. Monta a URL da API do Google
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    // 4. Monta o payload que o Google espera
    const googlePayload = {
      contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    // 5. Chama a API do Google (do lado do servidor)
    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googlePayload),
    });

    // 6. Analisa a resposta do Google
    const data = await response.json();

    if (!response.ok) {
      // Se o Google der erro, repassa o erro para o frontend
      console.error('Erro da API do Google:', data);
      return res.status(response.status).json(data);
    }

    // 7. Se der certo, repassa a resposta do Google para o frontend
    return res.status(200).json(data);

  } catch (error) {
    // Se o nosso backend falhar
    console.error('Erro interno no backend:', error);
    return res.status(500).json({ error: 'Erro interno no servidor da Vercel' });
  }
}
