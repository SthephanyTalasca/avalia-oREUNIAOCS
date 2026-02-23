export default async function handler(req, res) {
    // Mantendo seus headers de CORS
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

        // MODELO ESTÁVEL: gemini-1.5-flash (ou gemini-1.5-flash-8b para ser ainda mais leve)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `VOCÊ É UM AUDITOR DE QUALIDADE. Analise a transcrição abaixo e retorne APENAS o JSON solicitado seguindo as regras de pontuação e os 16 critérios.\n\nTRANSCRIÇÃO:\n${transcriptText}` 
                    }] 
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        if (!data.candidates || !data.candidates[0].content) {
            return res.status(422).json({ error: "O modelo recusou a resposta por segurança ou cota insuficiente." });
        }

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
