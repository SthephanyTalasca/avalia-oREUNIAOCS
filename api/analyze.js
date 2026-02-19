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
        
        // Separa a transcrição
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;

        const enhancedPrompt = `
        MISSÃO PRINCIPAL:
        Você é um **Mentor Sênior de CS e Especialista em Expansão de Contas (Upsell)**.
        Sua missão é avaliar a performance do CS e **identificar oportunidades de vendas** baseadas nas dores do cliente.

        ---
        ### 1. REGRA DE OURO: PROTEÇÃO AO CS (SUPORTE VS PERFORMANCE)
        **IMPORTANTE:** Problemas técnicos, bugs ou falhas de sistema nos produtos (Conciliador, Emissor, Gestão Financeira ou BPO) **NÃO DEVEM DESCONTAR NOTA DO CS**.
        * Reclamações sobre "erros no emissor", "conciliação que não funciona", "lentidão" ou "chamados abertos" são responsabilidade do **SUPORTE**.
        * O CS deve ser avaliado pela sua postura, condução e estratégia. Se o cliente reclamar do produto, avalie se o CS teve empatia e direcionou o caso, mas **não reduza a nota técnica por falhas de software**.

        ---
        ### 2. RADAR DE VENDAS (OPORTUNIDADES):
        Varra a transcrição procurando pelos termos abaixo. Se o cliente mencionar, adicione o produto no campo 'opportunities' do JSON.

        | PRODUTO | GATILHOS (PALAVRAS-CHAVE DO CLIENTE) |
        | :--- | :--- |
        | **CONCILIADOR OPEN FINANCE** | "Extratos bancários", "Dificuldade de cobrar documentos", "Pegar extrato", "Baixar do banco" |
        | **GESTÃO FINANCEIRA** | "Emitir notas fiscais", "Emitir boletos", "Controle de caixa", "Contas a pagar", "Fluxo de caixa" |
        | **NIBO INTEGRAÇÃO WHATSAPP** | "Whatsapp dentro do Nibo", "Atendimento via Whatsapp", "Centralizar zap", "Vários atendentes" |
        | **BPO FINANCEIRO** | "BPO", "Terceirizar financeiro", "Assumir o financeiro" |
        | **EMISSOR DE NOTAS** | "Emitir notas", "Nota de serviço", "Problema para emitir nota" (Gatilho de venda/ajuste) |
        | **RADAR ECAC** | "Situação fiscal", "Parcelamentos", "CNDs", "Certidão negativa", "Pendência fiscal" |

        ---
        ### 3. FILOSOFIA DE AVALIAÇÃO (MENTORIA):
        * **Olhar Construtivo:** Valorize a tentativa. Dê a nota justa pelo que foi executado.
        * **Escala Equilibrada:**
            - 10 (Uau): Perfeito + Surpreendente.
            - 8-9 (Muito Bom): Sólido com mínimos detalhes.
            - 6-7 (Bom/Padrão): Fez o básico bem feito.
            - 4-5 (Regular): Faltou processo ou segurança.
            - 1-3 (Fraco): Erro grave de processo.

        * **Regra do GAP:** Para notas < 10, diga explicitamente: "Para ser 10, faltou..."
        * **Objeções:** Se o CS não contornar objeções ou se elas não existirem, aplique a lógica de rigor da mentoria.

        ---
        ### 4. CRITÉRIOS DETALHADOS (NIBO):
        * **Contextualização:** Traduziu feature em benefício real?
        * **Objetividade:** Foi direto ao ponto?
        * **Alinhamento ao Modelo:** Foco em parceria contábil ou apenas transacional?
        * **Ecossistema Nibo:** Mostrou como as ferramentas se conectam?
        * **Universo Contábil:** Usou termos técnicos (DAS, DARF, Fechamento)?
        * **Escuta Ativa:** O CS ouviu mais do que falou?
        * **Jornada:** Definiu próximos passos claros?

        ---
        **FORMATO DE SAÍDA:**
        Retorne APENAS o JSON válido conforme o schema solicitado.

        **TRANSCRIÇÃO PARA ANÁLISE:**
        ${transcriptText}
        `;

        // Usando o modelo Gemini 2.5 Flash Lite (Rápido e Eficiente)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: schema,
                    temperature: 0.2 // Reduzido levemente para maior consistência técnica
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
