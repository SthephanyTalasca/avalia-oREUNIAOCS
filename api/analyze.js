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

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Chave de API ausente.' });

    try {
        const { prompt: userPrompt, schema } = req.body;
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;

        const enhancedPrompt = `
        VOCÊ É UM AUDITOR DE QUALIDADE SÊNIOR. Sua tarefa é decompor a análise em 5 pilares matemáticos.
        
        ### REGRA DE OURO (ISENÇÃO TÉCNICA):
        Problemas de sistema (Bugs no Emissor, Conciliador, Gestão, BPO, lentidão) são responsabilidade do SUPORTE. 
        Se o cliente reclamar disso, você deve dar nota máxima (10) no quesito técnico para o CS, avaliando apenas se ele foi empático. **Não puna o humano pelo erro da máquina.**

        ### PILARES DE AVALIAÇÃO (Dê de 0 a 10 em cada um):
        1. **POSTURA E RAPPORT:** Conexão com o cliente e empatia (especialmente em reclamações de sistema).
        2. **DOMÍNIO CONTÁBIL:** Uso correto de termos (DAS, DARF, Pro-labore, Balancete).
        3. **ESCUTA ATIVA E DIAGNÓSTICO:** O CS identificou as dores reais ou apenas seguiu script?
        4. **RADAR DE VENDAS (UPSOL):** O CS ofereceu Conciliador, Gestão, Zap ou Radar ECAC ao ouvir os gatilhos? (Se não havia gatilho, dê 10. Se havia e ele ignorou, dê 0).
        5. **RESOLUÇÃO E PRÓXIMOS PASSOS:** A reunião teve um fechamento claro?

        ### MÉTODO DE CÁLCULO OBRIGATÓRIO:
        - Você deve atribuir uma nota para cada um dos 5 pilares acima.
        - A nota final DEVE ser a média aritmética: (P1 + P2 + P3 + P4 + P5) / 5.
        - Não arredonde para 8.5 por preguiça. Se a soma der 7.2, a nota é 7.2. Se o CS foi perfeito e a soma deu 10, a nota é 10.

        ### RADAR DE VENDAS (GATILHOS):
        - Conciliador (Extratos/Documentos), Gestão (Boletos/Fluxo de Caixa), Zap (Atendimento), Radar ECAC (Pendências Fiscais).

        FORMATO DE SAÍDA:
        Retorne APENAS o JSON. No campo de justificativa, mostre o cálculo que você fez: "P1: 10, P2: 8..."
        
        TRANSCRIÇÃO:
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
                    temperature: 0.5 // Baixada para garantir precisão no cálculo matemático
                }
            })
        });

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
