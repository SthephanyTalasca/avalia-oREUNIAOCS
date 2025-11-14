export default async function handler(req, res) {
  try {
    const { transcricao, cs } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API KEY não encontrada" });
    }

    const url = `https://generative-language.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analise a transcrição abaixo e gere:
                - Resumo
                - Possíveis problemas
                - Tarefas para o CS ${cs}
                - Tarefas para o cliente
                
                Transcrição:
                ${transcricao}`
              }
            ]
          }
        ]
      })
    });

    const json = await geminiResponse.json();
    return res.status(200).json(json);
    
  } catch (e) {
    return res.status(500).json({ error: "Erro no servidor", details: e.message });
  }
}
