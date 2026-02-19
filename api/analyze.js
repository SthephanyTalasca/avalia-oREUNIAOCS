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
        
        // Separa a transcrição para garantir que a IA foque nela
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;
        
        // Debug: Mostra nos logs da Vercel o tamanho do texto recebido
        console.log("Recebendo transcrição com tamanho:", transcriptText.length);

        if (transcriptText.length < 50) {
            return res.status(400).json({ error: "O texto da transcrição parece muito curto ou vazio." });
        }

        // --- PROMPT DE "ALTA SENSIBILIDADE" ---
        const enhancedPrompt = `
        MISSÃO:
        Você é um Mentor Sênior de Customer Success. Sua tarefa é avaliar a reunião abaixo com **ALTA SENSIBILIDADE ÀS NUANCES**.
        
        🚨 PROBLEMA A EVITAR: Não dê notas médias (6, 7 ou 8) para todo mundo. Isso é inútil.
        
        SUA NOVA DIRETRIZ DE CALIBRAGEM:
        1. **Fuja da Média:** Se foi ruim, dê 4, 5 ou 6 sem medo. Se foi incrível, dê 9 ou 10. Só dê 7 se for realmente "apenas ok".
        2. **Compare com a Excelência:** Uma nota 10 significa que o CS não apenas fez o básico, mas encantou, usou técnicas avançadas e dominou a conversa. Se ele só "seguiu o script", a nota é 6.
        3. **Seja Específico:** Não repita elogios genéricos. Encontre o detalhe que fez a diferença (para o bem ou para o mal).

        CRITÉRIOS DE AVALIAÇÃO (MENTORIA):
        * Contextualização: O cliente entendeu o "porquê"? (Nota 10 = Cliente teve um momento "Ah, entendi!")
        * Objetividade: Foi direto? (Nota baixa se o cliente teve que interromper ou perguntar "mas e quanto a X?")
        * Ecossistema Nibo/Contabilidade: Usou os termos certos? (DAS, DARF, Fechamento). Se falou termo errado, a nota cai drasticamente.
        * Postura/Rapport: Parecia um robô (nota 4) ou um parceiro humano (nota 10)?
        * Jornada: O próximo passo ficou cristalino?

        FORMATO JSON OBRIGATÓRIO:
        Mantenha a estrutura JSON solicitada.

        TRANSCRIÇÃO DA REUNIÃO PARA ANÁLISE:
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
                    temperature: 0.5 // AUMENTADO: Mais criatividade e variabilidade nas notas
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
