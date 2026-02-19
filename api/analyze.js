export default async function handler(req, res) {
    // Configuração de CORS (Permissões de acesso)
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

        // Extrai apenas a transcrição do envio original para injetar no novo prompt
        const transcriptText = userPrompt.split("TRANSCRIÇÃO:")[1] || userPrompt;

        // AQUI ESTÁ O SEU NOVO PROMPT APRIMORADO
        const enhancedPrompt = `
        MISSÃO PRINCIPAL:
        Você é um especialista em Quality Assurance de Customer Experience, com um perfil extremamente crítico, rigoroso e detalhista. A sua única missão é analisar a transcrição de uma reunião entre um Customer Success (CS) e um cliente, avaliando a performance do CS com base nas regras e critérios invioláveis abaixo. A sua análise deve ser implacável, baseada apenas em evidências explícitas na transcrição.

        FILOSOFIA DE AVALIAÇÃO E REGRAS MANDATÓRIAS (INVIOLÁVEIS):
        1. PRINCÍPIO "PROVE A COMPETÊNCIA" (PONTO DE PARTIDA = NOTA 1): A avaliação de CADA critério começa, obrigatoriamente, com a nota 1 (Ruim). Para que a nota aumente, você precisa encontrar evidências claras, explícitas e proativas de que a habilidade foi utilizada. A ausência de evidência é prova de incompetência no critério. Não há pontos por esforço ou por "não errar". A competência deve ser provada.
        
        2. A ESCALA DA VERDADE (OBRIGATÓRIA):
           - 10 (Excelente): Superou todas as expectativas de forma proativa, estratégica e memorável. Demonstrou maestria.
           - 8-9 (Cumpriu Quase Sempre): Demonstrou a habilidade consistentemente, na grande maioria das oportunidades, com poucas falhas.
           - 6-7 (Fez o Básico): Cumpriu o esperado de forma reativa. Uma performance correta, mas sem brilho, iniciativa ou personalização.
           - 4-5 (Cumpriu Pouco): Demonstrou a habilidade de forma irregular e inconsistente. Mais falhas do que acertos.
           - 2-3 (Raramente Cumpriu): Raras e fracas demonstrações da habilidade. Performance muito deficiente.
           - 0-1 (Ruim/Não Cumpriu): Nenhuma ou pouquíssima evidência. (Nota padrão).

        3. REGRA DA JUSTIFICATIVA "POR QUE NÃO 10?": Para TODO critério que receber uma nota inferior a 10, a sua justificativa DEVE obrigatoriamente explicar o que faltou para atingir a nota máxima. Seja específico.
           Exemplo Bom (Nota 7): "O CS foi claro na explicação inicial, mas não atingiu a nota máxima porque não utilizou analogias ou exemplos práticos para simplificar um tema complexo, nem validou o entendimento do cliente com perguntas."

        4. REGRA DA EXCEÇÃO "OBJEÇÕES": Se a transcrição não contiver nenhuma objeção explícita do cliente, o critério 'Objeções' DEVE receber a nota -1 e a justificativa deve ser: "Não foram identificadas objeções claras por parte do cliente durante a transcrição da chamada. Portanto, este critério não é aplicável para avaliação."

        5. REGRA "ENCANTAMENTO É INDEPENDENTE": A avaliação do critério 'Encantamento' não deve ser impactada pela presença ou ausência de objeções. Avalie-o com base na capacidade do CS de criar momentos "uau" e superar as expectativas.

        6. PONTO DE ATENÇÃO CRÍTICO "ESCUTA ATIVA": Se o percentual de fala do CS for superior a 80%, isso é uma falha grave. A nota de 'Escuta Ativa' deve ser automaticamente baixa (entre 1 e 3) e este ponto DEVE ser mencionado como o primeiro item nos "Pontos a Melhorar" do plano de ação.

        7. PLANO DE AÇÃO OBRIGATÓRIO: Identifique, no mínimo, 2-3 pontos de melhoria (erros específicos cometidos) e 2-3 sugestões práticas (ações claras que o CS pode tomar para melhorar).

        8. ANÁLISE DE PERFIL DE CLIENTE: Crie um perfil descritivo (ex: "O Cético Sobrecarregado", "O Analítico Detalhista"). Justifique com evidências e avalie como o CS lidou com esse perfil.

        CRITÉRIOS DE AVALIAÇÃO DETALHADOS E ESPECÍFICOS:
        * Contextualização: Se o CS explicou para que serve cada parte da ferramenta E utilizou exemplos práticos, a nota é 10. Caso contrário, a nota diminui.
        * Objetividade: Se o CS foi direto, explicou a funcionalidade e deu exemplos, a nota é 10. Se repetiu informações desnecessárias ou foi pouco claro, a nota diminui.
        * Alinhamento ao Modelo de Negócio: Se o CS demonstrou entender o modelo de negócio do cliente E conseguiu aplicar isso à ferramenta ou aos próximos passos, a nota é 10.
        * Ecossistema Nibo: Se o CS citou outras ferramentas da plataforma E explicou como se relacionam com o que estava sendo apresentado, a nota é 10.
        * Universo da Contabilidade: Se o CS mostrou domínio de termos (DAS, DARF, etc.), usou exemplos práticos ("esse DCTFWeb aqui você protocola assim...") e falou com naturalidade sobre contabilidade, a nota é 10.
        * Escuta Ativa: Avalie se o CS demonstrou ouvir ativamente. Penalize fortemente se falar mais de 80% do tempo ou interromper.
        * Jornada do Cliente: Se o CS deixou claro em qual etapa o cliente está E explicou os próximos passos e a evolução, a nota é 10.
        * Rapport: A nota deve refletir o nível de conexão, uso do nome do cliente e leveza.
        * Clareza: Comunicação assertiva, sem gaguejar, cliente entendeu tudo.
        * Flexibilidade: Capacidade de adaptar o roteiro à necessidade do cliente.
        * Encantamento: Entusiasmo, demonstração de valor prático e reações positivas do cliente.
        * Consultividade: Agiu como parceiro estratégico ou apenas apresentador?
        * Autoridade: Conduziu com confiança?
        * Postura: Profissionalismo diante de dificuldades.
        * Gestão de Tempo: Reunião produtiva e dentro do tempo.
        * Domínio de Produto: Conhecimento profundo e casos de uso.

        TRANSCRIÇÃO DA REUNIÃO:
        ${transcriptText}
        `;

        // URL do Modelo Gemini 2.5 Flash Lite
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: schema,
                    temperature: 0.1 // Mantendo baixo para ser bem rigoroso nas regras
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
