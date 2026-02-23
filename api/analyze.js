export default async function handler(req, res) {
    // ... (headers omitidos para brevidade, mantenha os seus)

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Chave de API ausente.' });

    try {
        const { prompt: userPrompt } = req.body;
        const transcriptText = userPrompt.includes("TRANSCRIÇÃO:") 
            ? userPrompt.split("TRANSCRIÇÃO:")[1] 
            : userPrompt;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Analise a seguinte transcrição e retorne o JSON solicitado:\n${transcriptText}` }] }],
                // ADICIONADO: Configurações de segurança para evitar bloqueio falso-positivo
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

        // 1. Verifica erro direto da API (como Quota)
        if (data.error) {
            return res.status(500).json({ error: `Erro da API: ${data.error.message}` });
        }

        // 2. Verifica se a resposta foi bloqueada por segurança
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            const reason = data.promptFeedback?.blockReason || "Motivo desconhecido (provável cota zero)";
            return res.status(422).json({ 
                error: "A API não gerou conteúdo.", 
                reason: reason,
                full_response: data // Para você ver o que o Google mandou
            });
        }

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error("Erro no processamento:", error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
