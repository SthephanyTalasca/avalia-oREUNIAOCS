export default async function handler(req, res) {
    // Configuração de CORS
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

        const enhancedPrompt = `
        MISSÃO PRINCIPAL:
        Você é um **Mentor Sênior de CS e Especialista em Upsell**. 
        Sua análise deve ser **justa, profunda e baseada em evidências**. Fuja do vício de dar notas médias (8.5) para tudo. 

        ---
        ### 1. REGRA DE PROTEÇÃO (SISTEMA VS PESSOA)
        **IMPORTANTE:** Problemas técnicos nos produtos (Conciliador, Emissor, Gestão Financeira ou BPO) são de **responsabilidade do SUPORTE**.
        * **NÃO DESCONTE NOTA DO CS** por bugs, erros de integração ou lentidão do software.
        * Avalie o CS pela forma como ele contornou a situação e se manteve o foco na estratégia, mesmo com o cliente reclamando do sistema.

        ---
        ### 2. FILOSOFIA DE NOTAS (OBJETIVIDADE TOTAL):
        * **Nota 10 (Excelência):** Se o CS cumpriu todos os requisitos, foi empático, técnico e não deixou passar oportunidades, **DÊ 10 SEM HESITAR**. O 10 é o reconhecimento do trabalho bem feito.
        * **Notas Baixas (Rigor):** Se o CS foi robótico, ignorou o cliente ou perdeu ganchos de venda claros, **dê notas condizentes (4, 5 ou 6)**. Não tente "suavizar" um desempenho fraco com uma nota morna.
        * **Justificativa:** Toda nota abaixo de 10 deve vir acompanhada de um "Para ser 10, faltou...". Se for 10, justifique o que foi o ponto alto.

        ---
        ### 3. RADAR DE VENDAS (FOCO EM EXPANSÃO):
        Identifique ganchos para os produtos abaixo e preencha o campo 'opportunities':
        - **CONCILIADOR:** Falar de "extratos", "PDF", "demora para conciliar", "cobrar doc do cliente".
        - **GESTÃO FINANCEIRA:** Falar de "financeiro do cliente", "contas a pagar/receber", "fluxo de caixa".
        - **INTEGRAÇÃO WHATSAPP:** Falar de "atendimento", "muito volume no zap", "centralizar conversas".
        - **RADAR ECAC:** Falar de "situação fiscal", "CND", "parcelamento", "multas".

        ---
        ### 4. CRITÉRIOS DE AVALIAÇÃO:
        * **Escuta Ativa:** O CS realmente ouviu as dores ou só queria "vender" o próximo passo?
        * **Domínio Contábil:** Demonstrou autoridade sobre a rotina (fechamentos, obrigações)?
        * **Condução e Próximos Passos:** A reunião terminou com um plano de ação claro ou ficou solta?

        ---
        **FORMATO DE SAÍDA:**
        Retorne APENAS o JSON válido conforme o schema solicitado. Seja específico e analítico nos comentários.

        **TRANSCRIÇÃO PARA ANÁLISE:**
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
                    temperature: 0.6 // Equilíbrio perfeito para discernimento crítico sem perder a lógica.
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
