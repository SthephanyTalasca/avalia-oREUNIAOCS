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
        
        // Extrai apenas o texto da transcrição para evitar poluição no prompt
        const transcriptText = userPrompt.includes("TRANSCRIÇÃO:") 
            ? userPrompt.split("TRANSCRIÇÃO:")[1] 
            : userPrompt;

        const enhancedPrompt = `
        VOCÊ É UM AUDITOR MATEMÁTICO DE QUALIDADE. 
        Sua tarefa é analisar a transcrição e atribuir notas de 0 a 10 para 5 critérios específicos.

        ### REGRAS DE OURO:
        - Erros de sistema/software (bugs, lentidão) = Nota 10 em conhecimento técnico para o CS.
        - Se não houver gatilho para venda (Expansão) = Nota 10 automático no critério 4.

        ### CRITÉRIOS (C1 a C5):
        1. **Postura e Empatia**
        2. **Conhecimento Contábil**
        3. **Escuta Ativa**
        4. **Radar de Expansão**
        5. **Fechamento**

        ### PROTOCOLO DE CÁLCULO OBRIGATÓRIO:
        Para o campo de nota final, você deve seguir este processo mental:
        PASSO 1: Defina as notas de C1, C2, C3, C4 e C5.
        PASSO 2: Calcule a SOMA = (C1 + C2 + C3 + C4 + C5).
        PASSO 3: Calcule a MÉDIA = SOMA / 5.
        
        A 'nota_final' (ou campo equivalente no schema) DEVE SER EXATAMENTE o resultado do PASSO 3. Não arredonde para cima e não ignore as notas individuais.

        TRANSCRIÇÃO:
        ${transcriptText}
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: schema,
                    temperature: 0.1 // Reduzido para 0.1 para precisão máxima em cálculos
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
