export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Chave de API não configurada na Vercel.' });
    }

    try {
        const { prompt: userPrompt, schema } = req.body;
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;

        // --- PROMPT AJUSTADO: MAIS JUSTO E PEDAGÓGICO ---
        const enhancedPrompt = `
        MISSÃO PRINCIPAL:
        Você é um Mentor Sênior de Customer Success focado em desenvolvimento de talentos. 
        Sua missão é analisar a transcrição de forma **justa, equilibrada e construtiva**.
        Em vez de apenas procurar erros, você deve reconhecer os acertos e apontar oportunidades de evolução.

        FILOSOFIA DE AVALIAÇÃO (MENTORIA):
        1. **Olhar Construtivo:** Valorize a tentativa e a intenção do CS. Se ele fez o processo corretamente, dê a nota justa. Não exija perfeição absoluta para notas altas.
        2. **Contexto:** Entenda que nem toda reunião permite usar todas as técnicas. Se não houve oportunidade, não penalize severamente.

        ESCALA DE NOTAS (EQUILIBRADA):
           - 10 (Excepcional): Fez tudo o que se esperava e ainda surpreendeu positivamente.
           - 8-9 (Muito Bom): Execução sólida e consistente. Cometeu deslizes mínimos que não afetaram o resultado.
           - 6-7 (Bom/Esperado): Fez o "feijão com arroz" bem feito. Cumpriu o processo, mas sem grande destaque ou personalização.
           - 4-5 (Regular): Faltaram pontos importantes do processo ou houve insegurança.
           - 1-3 (Precisa Melhorar): Falhas claras de processo ou postura.
           - 0 (Não Realizado): Ignorou totalmente o critério quando deveria ter feito.

        REGRAS ESPECÍFICAS:
        1. **Justificativa Pedagógica:** Para notas abaixo de 10, explique de forma amigável: "Para chegar no 10, você poderia ter feito X ou Y...".
        2. **Objeções:** Se o cliente não fez objeções, mantenha a nota -1 (Não se aplica).
        3. **Escuta Ativa:** Monitore o tempo de fala. Se o CS falou muito mais que o cliente (>70%), alerte nos pontos de melhoria, mas avalie o contexto (às vezes era um treinamento necessário).

        CRITÉRIOS DE AVALIAÇÃO (NIBO/CONTABILIDADE):
        * Contextualização e Clareza: Explicou bem os benefícios? O cliente entendeu?
        * Objetividade: Foi direto ao ponto respeitando o tempo do cliente?
        * Ecossistema Nibo & Contabilidade: Mostrou que entende do produto e das dores do contador (termos como DAS, DARF, fechamento)?
        * Postura e Rapport: Foi educado, chamou pelo nome e criou conexão?
        * Jornada do Cliente: Deixou claros os próximos passos?

        FORMATO DA RESPOSTA:
        Mantenha estritamente o JSON solicitado.

        TRANSCRIÇÃO DA REUNIÃO:
        ${transcriptText}
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: schema,
                    temperature: 0.3 // Aumentei levemente para ele ser mais natural/humano na análise
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Erro Google API: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error("Erro no Backend:", error);
        res.status(500).json({ error: error.message });
    }
}
