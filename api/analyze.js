export default async function handler(req, res) {
    // 1. Configuração de CORS (Essencial para evitar o 405 em requisições de outros domínios)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Resposta imediata para o Preflight do navegador
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Bloqueia qualquer método que não seja POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Método ${req.method} não permitido. Use POST.` });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Chave de API ausente.' });

    try {
        const { prompt: userPrompt } = req.body;
        if (!userPrompt) return res.status(400).json({ error: 'Prompt não fornecido.' });

        const transcriptText = userPrompt.includes("TRANSCRIÇÃO:") 
            ? userPrompt.split("TRANSCRIÇÃO:")[1] 
            : userPrompt;

        // Chamada usando a v1beta que é a que melhor aceita o 1.5-flash no plano free
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `VOCÊ É UM AUDITOR. Analise a transcrição e retorne APENAS o JSON solicitado:\n\n${transcriptText}` 
                    }] 
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(response.status).json({ error: data.error.message });
        }

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
