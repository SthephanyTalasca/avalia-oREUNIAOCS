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

        // URL ATUALIZADA PARA GEMINI 2.5 FLASH-LITE
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `
        VOCÊ É UM AUDITOR DE QUALIDADE MATEMÁTICO E CRÍTICO.
        
        ### REGRAS INVIOLÁVEIS DE PONTUAÇÃO:
        1. **PONTO DE PARTIDA NOTA 1:** Tudo começa em 1.
        2. **GATILHOS DE NOTA 10 (SEJA JUSTO):** Se o CS realizou a ação de forma clara e profissional, a nota DEVE ser 10. Não tire pontos sem um motivo real e grave.
        3. **NÃO SEJA "MESQUINHO":** Se a performance cumpriu todos os requisitos, atribua nota 10.
        4. **REGRA DA SOMATÓRIA:** A "notaGeral" deve ser a **SOMA TOTAL** das notas. NÃO CALCULE MÉDIA.

         ### CRITÉRIOS DETALHADOS QUE DEVEM APARECER NO ARRAY 'evaluation' (OBRIGATÓRIO OS 16):
        - Consultividade
        - Escuta Ativa
        - Jornada do Cliente
        - Encantamento
        - Objeções
        - Rapport
        - Autoridade
        - Postura
        - Gestão de Tempo
        - Contextualização
        - Objetividade
        - Flexibilidade
        - Domínio de Produto
        - Alinhamento ao Modelo de Negócio
        - Ecossistema Nibo
        - Universo da Contabilidade

        ### ESTRUTURA DE SAÍDA (JSON):
        {
          "notaGeral": number,
          "evaluation": [{"criterio": string, "nota": number, "justificativa": string}],
          "speakingTime": {"cs": number, "client": number},
          "profileAnalysis": {"profile": string, "handling": string, "suggestions": string},
          "summary": {"geral": string, "specificErrors": [string], "sugestoes": [string]},
          "cancellationAlert": {"risk": boolean, "reason": string},
          "meetingHighlight": string,
          "opportunities": [{"product": string, "reason": string}]
        }

        TRANSCRIÇÃO:
        ${transcriptText}` 
                    }] 
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        // Tratamento de erro de quota ou modelo inexistente
        if (data.error) {
            return res.status(data.error.code || 500).json({ 
                error: data.error.message,
                tip: "Se o erro for 'Model not found', altere o nome do modelo para gemini-2.0-flash-lite-preview-02-05"
            });
        }

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor ao processar JSON." });
    }
}
