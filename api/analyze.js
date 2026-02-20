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

        const enhancedPrompt = `
        VOCÊ É UM AUDITOR DE QUALIDADE MATEMÁTICO E CRÍTICO.
        
        ### REGRAS INVIOLÁVEIS DE PONTUAÇÃO:
        1. **PONTO DE PARTIDA NOTA 1:** Tudo começa em 1.
        2. **GATILHOS DE NOTA 10 (SEJA JUSTO):** Se o CS realizou a ação de forma clara e profissional, a nota DEVE ser 10. Não tire pontos sem um motivo real e grave. Se ele citou termos técnicos corretamente ou usou exemplos do dia a dia, dê o 10.
        3. **NÃO SEJA "MESQUINHO":** Se a performance cumpriu todos os requisitos do critério detalhado abaixo, atribua nota 10. Reserve notas 8 e 9 apenas se houve uma falha leve perceptível.
        4. **REGRA DA SOMATÓRIA:** A "notaGeral" deve ser a **SOMA TOTAL** de todas as notas do array evaluation. (Ex: 16 critérios x nota 10 = 160). NÃO CALCULE MÉDIA.

        ### CRITÉRIOS PARA NOTA 10 (GATILHOS):
        - **Universo da Contabilidade:** Se citou (DAS, DARF, DCTFWeb, impostos) com naturalidade = Nota 10.
        - **Ecossistema Nibo:** Se citou Emissor, Conciliador, Gestão ou Whatsapp Wheb e explicou a vantagem = Nota 10.
        - **Contextualização:** Se usou um cenário real (ex: "quando seu cliente mandar a nota...") = Nota 10.
        - **Flexibilidade:** Se não houve imprevisto, ou se lidou bem com um = Nota 10.
        - **Objeções:** Se não houve, nota 0 (Zero) para não interferir na soma. Se houve e resolveu = Nota 10.
        - **Escuta Ativa:** Se o tempo de fala do CS for equilibrado (não dominou sozinho) = Nota 10.

        ### FORMATO DE SAÍDA:
        Retorne APENAS o JSON conforme este esquema:
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
        ${transcriptText}
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error.message });

        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
