import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 120;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Use POST." });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "O texto da transcrição é obrigatório." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // ─────────────────────────────────────────────────────────────────────
        // ETAPA 1 — Comprime a transcrição em um resumo estruturado
        // Isso resolve o problema de transcrições longas que cortam o JSON final
        // ─────────────────────────────────────────────────────────────────────
        const compressionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Você é um assistente de auditoria de vendas. Leia a transcrição abaixo e extraia os momentos mais importantes para avaliar a performance do consultor de vendas.

Extraia e organize:
1. Como o consultor se apresentou e criou rapport
2. Como identificou as dores e necessidades do cliente
3. Perguntas poderosas feitas pelo consultor
4. Como demonstrou o produto/solução
5. Objeções levantadas pelo cliente e como foram tratadas
6. Tentativas de fechamento ou encaminhamento
7. Próximos passos combinados
8. Tom geral da conversa e postura do consultor
9. Tempo estimado de fala de cada lado (% aproximado)
10. Concorrentes mencionados
11. Checklist: o consultor (a) retomou problemas iniciais? (b) pediu feedback da ferramenta? (c) pediu voto de confiança? (d) tratou objeção de sócio ausente? (e) isolou objeção de mensalidade vs setup? (f) mencionou gestão financeira gratuita?

Seja detalhado mas objetivo. Preserve citações literais importantes do consultor e do cliente.

TRANSCRIÇÃO:
${prompt}`,
            config: { maxOutputTokens: 4096 }
        });

        const transcricaoResumida = compressionResponse.text;

        if (!transcricaoResumida || transcricaoResumida.trim().length < 50) {
            return res.status(500).json({ error: "Não foi possível processar a transcrição. Verifique se o conteúdo é válido." });
        }

        // ─────────────────────────────────────────────────────────────────────
        // ETAPA 2 — Análise completa com base no resumo estruturado
        // ─────────────────────────────────────────────────────────────────────
        const systemInstruction = `Você é um auditor sênior de Vendas do Nibo. Com base no resumo estruturado de uma reunião de vendas, avalie a performance do consultor dando notas de 1 a 5 para os 12 pilares abaixo.

1. Postura: Profissionalismo, confiança e presença do consultor.
2. Clareza da Apresentação: Comunicação objetiva e didática do produto.
3. Conhecimento de Produto: Domínio técnico e fluência na demonstração do Nibo.
4. Personalização do Pitch: Adaptação da abordagem à realidade do cliente.
5. Escuta Ativa: Atenção às necessidades, dores e sinais do cliente.
6. Perguntas Poderosas: Uso de perguntas que aprofundam dores e criam consciência de valor.
7. Contorno de Objeções: Capacidade de neutralizar resistências com calma e argumentação sólida.
8. Expansão: Identificação e exploração de oportunidades de upsell/cross-sell.
9. Pré-Fechamento: Criação de urgência, validação de interesse e encaminhamento da decisão.
10. Fechamento: Pedido claro de compra ou avanço concreto no negócio.
11. Jornada do Cliente: Alinhamento de próximos passos, prazos e expectativas.
12. Rapport: Conexão humana, empatia e tom de parceria com o cliente.

Para CADA PILAR forneça:
- nota de 1 a 5
- porque_[pilar]: motivo direto em até 2 frases
- melhoria_[pilar]: o que faltou para nota 5. Se nota = 5, escreva "Critério de excelência atingido."

Seja direto e objetivo em todos os textos. Não deixe nenhum campo em branco.`;

        const analysisResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analise esta reunião de vendas e preencha todos os campos da avaliação:\n\n${transcricaoResumida}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        media_final:             { type: Type.NUMBER },
                        resumo_executivo:        { type: Type.STRING },
                        chance_fechamento:       { type: Type.STRING },
                        alerta_cancelamento:     { type: Type.STRING },
                        concorrentes_detectados: { type: Type.ARRAY, items: { type: Type.STRING } },

                        nota_postura:              { type: Type.NUMBER }, porque_postura:              { type: Type.STRING }, melhoria_postura:              { type: Type.STRING },
                        nota_clareza_apresentacao: { type: Type.NUMBER }, porque_clareza_apresentacao: { type: Type.STRING }, melhoria_clareza_apresentacao: { type: Type.STRING },
                        nota_conhecimento:         { type: Type.NUMBER }, porque_conhecimento:         { type: Type.STRING }, melhoria_conhecimento:         { type: Type.STRING },
                        nota_personalizacao_pitch: { type: Type.NUMBER }, porque_personalizacao_pitch: { type: Type.STRING }, melhoria_personalizacao_pitch: { type: Type.STRING },
                        nota_escuta:               { type: Type.NUMBER }, porque_escuta:               { type: Type.STRING }, melhoria_escuta:               { type: Type.STRING },
                        nota_perguntas_poderosas:  { type: Type.NUMBER }, porque_perguntas_poderosas:  { type: Type.STRING }, melhoria_perguntas_poderosas:  { type: Type.STRING },
                        nota_contorno_objecoes:    { type: Type.NUMBER }, porque_contorno_objecoes:    { type: Type.STRING }, melhoria_contorno_objecoes:    { type: Type.STRING },
                        nota_expansao:             { type: Type.NUMBER }, porque_expansao:             { type: Type.STRING }, melhoria_expansao:             { type: Type.STRING },
                        nota_pre_fechamento:       { type: Type.NUMBER }, porque_pre_fechamento:       { type: Type.STRING }, melhoria_pre_fechamento:       { type: Type.STRING },
                        nota_fechamento:           { type: Type.NUMBER }, porque_fechamento:           { type: Type.STRING }, melhoria_fechamento:           { type: Type.STRING },
                        nota_jornada_cliente:      { type: Type.NUMBER }, porque_jornada_cliente:      { type: Type.STRING }, melhoria_jornada_cliente:      { type: Type.STRING },
                        nota_rapport:              { type: Type.NUMBER }, porque_rapport:              { type: Type.STRING }, melhoria_rapport:              { type: Type.STRING },

                        tempo_fala_consultor: { type: Type.STRING },
                        tempo_fala_cliente:   { type: Type.STRING },

                        checklist_fechamento: {
                            type: Type.OBJECT,
                            properties: {
                                resolveu_pontos_iniciais:             { type: Type.BOOLEAN },
                                pediu_feedback_ferramenta:            { type: Type.BOOLEAN },
                                pediu_voto_confianca:                 { type: Type.BOOLEAN },
                                tratou_objecao_socio:                 { type: Type.BOOLEAN },
                                validou_mensalidade_vs_setup:         { type: Type.BOOLEAN },
                                mencionou_gestao_financeira_gratuita: { type: Type.BOOLEAN }
                            }
                        },

                        pontos_fortes:           { type: Type.ARRAY, items: { type: Type.STRING } },
                        pontos_atencao:          { type: Type.ARRAY, items: { type: Type.STRING } },
                        justificativa_detalhada: { type: Type.STRING }
                    },
                    required: [
                        "media_final", "resumo_executivo", "chance_fechamento", "alerta_cancelamento", "concorrentes_detectados",
                        "nota_postura", "porque_postura", "melhoria_postura",
                        "nota_clareza_apresentacao", "porque_clareza_apresentacao", "melhoria_clareza_apresentacao",
                        "nota_conhecimento", "porque_conhecimento", "melhoria_conhecimento",
                        "nota_personalizacao_pitch", "porque_personalizacao_pitch", "melhoria_personalizacao_pitch",
                        "nota_escuta", "porque_escuta", "melhoria_escuta",
                        "nota_perguntas_poderosas", "porque_perguntas_poderosas", "melhoria_perguntas_poderosas",
                        "nota_contorno_objecoes", "porque_contorno_objecoes", "melhoria_contorno_objecoes",
                        "nota_expansao", "porque_expansao", "melhoria_expansao",
                        "nota_pre_fechamento", "porque_pre_fechamento", "melhoria_pre_fechamento",
                        "nota_fechamento", "porque_fechamento", "melhoria_fechamento",
                        "nota_jornada_cliente", "porque_jornada_cliente", "melhoria_jornada_cliente",
                        "nota_rapport", "porque_rapport", "melhoria_rapport",
                        "tempo_fala_consultor", "tempo_fala_cliente",
                        "checklist_fechamento", "pontos_fortes", "pontos_atencao", "justificativa_detalhada"
                    ]
                }
            }
        });

        let analysisData;
        try {
            analysisData = JSON.parse(analysisResponse.text);
        } catch (parseError) {
            console.error("Erro ao fazer parse do JSON:", analysisResponse.text);
            return res.status(500).json({ error: "Erro ao processar a resposta da IA. Tente novamente." });
        }

        return res.status(200).json(analysisData);

    } catch (error) {
        console.error("Erro na API:", error);
        return res.status(500).json({ error: "Erro do Google Gemini: " + error.message });
    }
}
