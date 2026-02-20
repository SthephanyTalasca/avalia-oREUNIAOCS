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

        // Lista explícita para forçar o modelo a processar todos os itens
        const criterios = [
            "Consultividade", "Escuta Ativa", "Jornada do Cliente", "Encantamento",
            "Objeções", "Rapport", "Autoridade", "Postura", "Gestão de Tempo",
            "Contextualização", "Objetividade", "Flexibilidade", "Domínio de Produto",
            "Alinhamento ao Modelo de Negócio", "Ecossistema Nibo", "Universo da Contabilidade"
        ];

        const enhancedPrompt = `
        VOCÊ É UM AUDITOR DE QUALIDADE MATEMÁTICO E CRÍTICO.
        
        ### REGRAS INVIOLÁVEIS:
        1. **LISTA COMPLETA:** Você DEVE avaliar obrigatoriamente os 16 critérios abaixo. Não omita nenhum.
        2. **PONTUAÇÃO:** Base 1. Se o CS foi profissional e claro, a nota é 10. Notas 8-9 apenas para falhas leves.
        3. **SOMA TOTAL:** O campo "notaGeral" DEVE ser a soma exata das 16 notas (Máximo 160). NÃO CALCULE MÉDIA.
        4. **SAÍDA:** Retorne apenas o JSON puro.

        ### CRITÉRIOS PARA AVALIAÇÃO:
        ${criterios.map((c, i) => `${i + 1}. ${c}`).join('\n')}

        ### ESTRUTURA DE SAÍDA (JSON):
        {
          "notaGeral": number,
          "evaluation": [
            { "criterio": "string", "nota": number, "justificativa": "string" }
          ],
          "speakingTime": { "cs": number, "client": number },
          "profileAnalysis": { "profile": "string", "handling": "string", "suggestions": "string" },
          "summary": { "geral": "string", "specificErrors": ["string"], "sugestoes": ["string"] },
          "cancellationAlert": { "risk": boolean, "reason": "string" },
          "meetingHighlight": "string",
          "opportunities": [{ "product": "string", "reason": "string" }]
        }

        TRANSCRIÇÃO:
        ${transcriptText}
        `;

        // Endpoint atualizado para Gemini 2.0 Flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1 // Mantém a precisão e evita alucinações na lista
                }
            })
        });

        const data = await response.json();

        if (data.error) return res.status(500).json({ error: data.error.message });

        // Extração do texto do candidato
        const resultString = data.candidates[0].content.parts[0].text;
        
        // Retorna o JSON parseado
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro interno no servidor ao processar auditoria." });
    }
}
