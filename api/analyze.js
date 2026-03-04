import { GoogleGenAI, Type } from '@google/genai';

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
        
        const systemInstruction = `Você é um auditor sênior de Customer Success (Sucesso do Cliente) do Nibo. Avalie a transcrição de implementação/onboarding e dê notas de 1 a 5 para os seguintes 17 pilares:

        1. Consultividade: Age como parceiro estratégico, sugerindo melhorias e explicando valor.
        2. Escuta Ativa: Ouve necessidades e adapta a conversa ao contexto (ex: BPO, 3º setor).
        3. Jornada do Cliente: Estabelece prazos (ex: 60 dias), próximos passos e deveres de casa.
        4. Encantamento: Entrega valor, materiais e cria momentos "uau".
        5. Objeções: Lida com problemas (bugs, falta de certificado A1) com calma e solução.
        6. Rapport: Conexão humana, empatia e tom amigável.
        7. Autoridade: Confiança, ritmo diretivo e segurança técnica.
        8. Postura: Profissionalismo e resiliência diante de bugs ou problemas do cliente.
        9. Gestão de Tempo: Cobre a pauta adequadamente sem perder o ritmo.
        10. Contextualização: Explica o "porquê" de cada função na prática contábil.
        11. Clareza: Comunicação didática para clientes de diferentes níveis tecnológicos.
        12. Objetividade: Respostas assertivas e diretas.
        13. Flexibilidade: Adapta o roteiro caso o cliente trave em alguma etapa.
        14. Domínio de Produto: Navegação fluida no Nibo, robôs e configurações.
        15. Domínio do Negócio: Entende os modelos contábeis e conecta com o Nibo.
        16. Compreensão do Ecossistema Nibo: Diferencia Obrigações, Financeiro, BPO, etc.
        17. Universo da Contabilidade: Usa linguagem contábil (DAS, eCAC, Domínio, Dexon) com naturalidade.

        Retorne as notas (1 a 5) e motivos curtos. Indique também o Risco de Churn, a Saúde do Cliente (Alta, Média, Baixa) e extraia pontos fortes e de atenção. Gere um relatório estruturado em Markdown.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        media_final: { type: Type.NUMBER },
                        resumo_executivo: { type: Type.STRING },
                        saude_cliente: { type: Type.STRING, description: "Alta, Média ou Baixa" },
                        risco_churn: { type: Type.STRING, description: "Possível risco de churn. Se não houver, diga 'Risco controlado.'" },
                        sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sistemas contábeis citados (ex: Domínio, Dexon)" },
                        
                        // As 17 Notas (1 a 5) e Justificativas
                        nota_consultividade: { type: Type.NUMBER }, porque_consultividade: { type: Type.STRING },
                        nota_escuta_ativa: { type: Type.NUMBER }, porque_escuta_ativa: { type: Type.STRING },
                        nota_jornada_cliente: { type: Type.NUMBER }, porque_jornada_cliente: { type: Type.STRING },
                        nota_encantamento: { type: Type.NUMBER }, porque_encantamento: { type: Type.STRING },
                        nota_objecoes: { type: Type.NUMBER }, porque_objecoes: { type: Type.STRING },
                        nota_rapport: { type: Type.NUMBER }, porque_rapport: { type: Type.STRING },
                        nota_autoridade: { type: Type.NUMBER }, porque_autoridade: { type: Type.STRING },
                        nota_postura: { type: Type.NUMBER }, porque_postura: { type: Type.STRING },
                        nota_gestao_tempo: { type: Type.NUMBER }, porque_gestao_tempo: { type: Type.STRING },
                        nota_contextualizacao: { type: Type.NUMBER }, porque_contextualizacao: { type: Type.STRING },
                        nota_clareza: { type: Type.NUMBER }, porque_clareza: { type: Type.STRING },
                        nota_objetividade: { type: Type.NUMBER }, porque_objetividade: { type: Type.STRING },
                        nota_flexibilidade: { type: Type.NUMBER }, porque_flexibilidade: { type: Type.STRING },
                        nota_dominio_produto: { type: Type.NUMBER }, porque_dominio_produto: { type: Type.STRING },
                        nota_dominio_negocio: { type: Type.NUMBER }, porque_dominio_negocio: { type: Type.STRING },
                        nota_ecossistema_nibo: { type: Type.NUMBER }, porque_ecossistema_nibo: { type: Type.STRING },
                        nota_universo_contabil: { type: Type.NUMBER }, porque_universo_contabil: { type: Type.STRING },
                        
                        tempo_fala_cs: { type: Type.NUMBER },
                        tempo_fala_cliente: { type: Type.NUMBER },
                        checklist_cs: {
                            type: Type.OBJECT,
                            properties: {
                                definiu_prazo_implementacao: { type: Type.BOOLEAN },
                                alinhou_dever_de_casa: { type: Type.BOOLEAN },
                                validou_certificado_digital: { type: Type.BOOLEAN },
                                agendou_proximo_passo: { type: Type.BOOLEAN },
                                conectou_com_dor_vendas: { type: Type.BOOLEAN },
                                explicou_canal_suporte: { type: Type.BOOLEAN }
                            }
                        },
                        pontos_fortes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        pontos_atencao: { type: Type.ARRAY, items: { type: Type.STRING } },
                        justificativa_detalhada: { type: Type.STRING }
                    },
                    required: [
                        "media_final", "resumo_executivo", "saude_cliente", "risco_churn", "sistemas_citados", 
                        "nota_consultividade", "porque_consultividade", "nota_escuta_ativa", "porque_escuta_ativa",
                        "nota_jornada_cliente", "porque_jornada_cliente", "nota_encantamento", "porque_encantamento",
                        "nota_objecoes", "porque_objecoes", "nota_rapport", "porque_rapport", "nota_autoridade", "porque_autoridade",
                        "nota_postura", "porque_postura", "nota_gestao_tempo", "porque_gestao_tempo", "nota_contextualizacao", "porque_contextualizacao",
                        "nota_clareza", "porque_clareza", "nota_objetividade", "porque_objetividade", "nota_flexibilidade", "porque_flexibilidade",
                        "nota_dominio_produto", "porque_dominio_produto", "nota_dominio_negocio", "porque_dominio_negocio",
                        "nota_ecossistema_nibo", "porque_ecossistema_nibo", "nota_universo_contabil", "porque_universo_contabil",
                        "tempo_fala_cs", "tempo_fala_cliente", "checklist_cs", "pontos_fortes", "pontos_atencao", "justificativa_detalhada"
                    ]
                }
            }
        });

        const analysisData = JSON.parse(response.text);
        return res.status(200).json(analysisData);

    } catch (error) {
        console.error("Erro na API:", error);
        return res.status(500).json({ error: "Falha ao analisar a transcrição." });
    }
}
