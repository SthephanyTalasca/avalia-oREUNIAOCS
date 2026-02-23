export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Chave de API ausente.' });

    try {
        const { prompt: userPrompt } = req.body;
        const transcriptText = userPrompt.includes("TRANSCRIÇÃO:") 
            ? userPrompt.split("TRANSCRIÇÃO:")[1] 
            : userPrompt;

        // MUDANÇA CRUCIAL: Usando a rota v1 estável e o modelo gemini-1.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `VOCÊ É UM AUDITOR DE QUALIDADE. Retorne um JSON com os 16 critérios baseados nesta transcrição:\n\n${transcriptText}` 
                    }] 
                }],
                generationConfig: {
                    // Nota: Se der erro de "Unknown name", use response_mime_type (com underscore) 
                    // ou remova esta linha e peça no prompt "RETORNE APENAS O JSON".
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        // Se o modelo 1.5-flash ainda der "not found", vamos tentar o fallback automático
        if (data.error && data.error.message.includes("not found")) {
             return res.status(404).json({ 
                error: "Modelo não encontrado. Tente trocar para 'gemini-1.5-flash-001' ou verifique sua API Key.",
                details: data.error.message 
            });
        }

        if (data.error) return res.status(500).json({ error: data.error.message });

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
