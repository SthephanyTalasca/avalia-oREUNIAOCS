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
        VOCÊ É UM ESPECIALISTA EM QUALITY ASSURANCE DE CX, CRÍTICO E RIGOROSO.
        
        ### FILOSOFIA DE AVALIAÇÃO (INVIOLÁVEL):
        1. **PROVE A COMPETÊNCIA:** Cada critério começa em NOTA 1. Aumente apenas com evidência clara.
        2. **ESCALA DA VERDADE:** 10 (Maestria), 8-9 (Consistente), 6-7 (Básico), 4-5 (Pouco), 2-3 (Raramente), 0-1 (Ruim).
        3. **JUSTIFICATIVA "POR QUE NÃO 10?":** Obrigatória para qualquer nota < 10.
        4. **REGRA DAS OBJEÇÕES:** Se não houver, nota -1 e texto padrão: "Não foram identificadas objeções claras...".
        5. **ESCUTA ATIVA:** Se fala do CS > 90%, nota entre 1-3. Penalize -1 ponto a cada 10% acima de 80%.

        ### MÉTODO DE CÁLCULO DA NOTA GERAL:
        A "notaGeral" deve ser a média aritmética exata: (Soma das notas de todos os critérios) / (Quantidade de critérios com nota >= 0). 
        CRÍTICO: O critério com nota -1 NÃO entra no cálculo da média.

        ### CRITÉRIOS DETALHADOS:
        - **Consultividade:** Diagnóstico proativo vs apresentador de software.
        - **Escuta Ativa:** Ouvir para entender vs apenas responder.
        - **Jornada do Cliente:** Conexão com passos passados e futuros.
        - **Encantamento:** Momentos "uau" e superação de expectativas.
        - **Objeções:** Contorno com empatia e dados (Regra -1).
        - **Rapport:** Conexão genuína, nomes, leveza.
        - **Autoridade:** Condução, ritmo e confiança.
        - **Postura:** Maturidade e profissionalismo.
        - **Gestão de Tempo:** Reunião focada e agenda validada.
        - **Contextualização:** Tradução de features em benefícios práticos.
        - **Objetividade:** Direto ao ponto, sem divagações.
        - **Flexibilidade:** Adaptação ao imprevisto (Nota 10 se não houve necessidade).
        - **Domínio de Produto:** Casos de uso avançados.
        - **Alinhamento ao Modelo de Negócio:** Aplicação estratégica à realidade do cliente.
        - **Ecossistema Nibo:** Integração entre ferramentas da plataforma.
        - **Universo da Contabilidade:** Domínio de termos (DAS, DARF, DCTFWeb) e rotinas contábeis.

        ### ESTRUTURA DE SAÍDA:
        Retorne um objeto JSON puro seguindo este esquema:
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

        // O Gemini retorna o JSON como uma string dentro do campo text
        const resultString = data.candidates[0].content.parts[0].text;
        res.status(200).json(JSON.parse(resultString));

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
