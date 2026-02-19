export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Chave de API ausente.' });

    try {
        const { prompt: userPrompt, schema } = req.body;
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;

        const enhancedPrompt = `
        VOCÊ É UM AUDITOR MATEMÁTICO DE QUALIDADE. 
        Sua nota final deve ser a média exata de 5 critérios. Não use 8.5 por padrão.
        
        ### REGRA DE OURO (SISTEMA VS HUMANO):
        Problemas técnicos (Bugs no Emissor, Conciliador, Gestão, BPO ou lentidão) são falhas de SUPORTE. 
        O CS ganha NOTA 10 no critério técnico se o erro for do sistema, pois ele não pode consertar o software.

        ### CRITÉRIOS DE PONTUAÇÃO (0 a 10):
        1. **Postura e Empatia:** Conexão e como lidou com as queixas.
        2. **Conhecimento Contábil:** Termos técnicos e entendimento da rotina do contador.
        3. **Escuta Ativa:** Diagnosticou as dores ou só seguiu script?
        4. **Radar de Expansão:** Ofereceu Conciliador, Gestão, Zap ou Radar ECAC nos gatilhos? (Se não houve gatilho, nota 10 automático).
        5. **Fechamento:** Próximos passos ficaram claros?

        ### MÉTODO DE CÁLCULO:
        Nota Final = (Critério 1 + 2 + 3 + 4 + 5) / 5.
        Se a média der 7.4, coloque 7.4. Se der 10, coloque 10. Justifique detalhadamente.

        TRANSCRIÇÃO:
        ${transcriptText}
        `;

        // CORREÇÃO DO MODELO: Usando 1.5 Flash (estável e rápido)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: schema,
                    temperature: 0.3 // Baixa para garantir que a conta matemática esteja certa
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(response.status).json({ error: data.error.message });
        }

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
}
