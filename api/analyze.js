import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── FASE 1: Comprime transcrições longas preservando evidências por pilar ────
async function compressTranscript(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            maxOutputTokens: 3000,
            systemInstruction: `Você receberá uma transcrição longa de reunião de CS/Onboarding do Nibo.
Extraia evidências concretas organizadas por cada um dos 17 pilares abaixo.
NÃO resuma genericamente — cite comportamentos, falas e momentos específicos observados.

Pilares: Consultividade | Escuta Ativa | Jornada do Cliente | Encantamento | Objeções/Bugs |
Rapport | Autoridade | Postura | Gestão de Tempo | Contextualização | Clareza | Objetividade |
Flexibilidade | Domínio de Produto | Domínio de Negócio | Ecossistema Nibo | Universo Contábil

Formato: uma seção por pilar com 1–3 evidências diretas ou parafraseadas.
Ao final, acrescente: sistemas/ferramentas citados, % estimado de fala CS vs cliente,
e se houve: prazo definido, dever de casa, validação de acesso, próxima reunião agendada,
retomada da dor de vendas, explicação do canal de suporte. Máximo 2000 palavras.`
        }
    });
    return res.text;
}

// ─── CHAMADA A: Notas + justificativas curtas + meta-dados (JSON estruturado) ─
async function getScores(content) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: content,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 6000,
            systemInstruction: `Você é auditor sênior de CS do Nibo. Avalie o conteúdo e dê notas de 1 a 5
para os 17 pilares. Para cada pilar: nota + motivo em ATÉ 1 FRASE + o que faltou para 5 em ATÉ 1 FRASE.
Se nota for 5 escreva "Critério de excelência atingido." em melhoria. Seja extremamente conciso.`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:      { type: Type.NUMBER },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },

                    nota_consultividade:    { type: Type.NUMBER }, porque_consultividade:    { type: Type.STRING }, melhoria_consultividade:    { type: Type.STRING },
                    nota_escuta_ativa:      { type: Type.NUMBER }, porque_escuta_ativa:      { type: Type.STRING }, melhoria_escuta_ativa:      { type: Type.STRING },
                    nota_jornada_cliente:   { type: Type.NUMBER }, porque_jornada_cliente:   { type: Type.STRING }, melhoria_jornada_cliente:   { type: Type.STRING },
                    nota_encantamento:      { type: Type.NUMBER }, porque_encantamento:      { type: Type.STRING }, melhoria_encantamento:      { type: Type.STRING },
                    nota_objecoes:          { type: Type.NUMBER }, porque_objecoes:          { type: Type.STRING }, melhoria_objecoes:          { type: Type.STRING },
                    nota_rapport:           { type: Type.NUMBER }, porque_rapport:           { type: Type.STRING }, melhoria_rapport:           { type: Type.STRING },
                    nota_autoridade:        { type: Type.NUMBER }, porque_autoridade:        { type: Type.STRING }, melhoria_autoridade:        { type: Type.STRING },
                    nota_postura:           { type: Type.NUMBER }, porque_postura:           { type: Type.STRING }, melhoria_postura:           { type: Type.STRING },
                    nota_gestao_tempo:      { type: Type.NUMBER }, porque_gestao_tempo:      { type: Type.STRING }, melhoria_gestao_tempo:      { type: Type.STRING },
                    nota_contextualizacao:  { type: Type.NUMBER }, porque_contextualizacao:  { type: Type.STRING }, melhoria_contextualizacao:  { type: Type.STRING },
                    nota_clareza:           { type: Type.NUMBER }, porque_clareza:           { type: Type.STRING }, melhoria_clareza:           { type: Type.STRING },
                    nota_objetividade:      { type: Type.NUMBER }, porque_objetividade:      { type: Type.STRING }, melhoria_objetividade:      { type: Type.STRING },
                    nota_flexibilidade:     { type: Type.NUMBER }, porque_flexibilidade:     { type: Type.STRING }, melhoria_flexibilidade:     { type: Type.STRING },
                    nota_dominio_produto:   { type: Type.NUMBER }, porque_dominio_produto:   { type: Type.STRING }, melhoria_dominio_produto:   { type: Type.STRING },
                    nota_dominio_negocio:   { type: Type.NUMBER }, porque_dominio_negocio:   { type: Type.STRING }, melhoria_dominio_negocio:   { type: Type.STRING },
                    nota_ecossistema_nibo:  { type: Type.NUMBER }, porque_ecossistema_nibo:  { type: Type.STRING }, melhoria_ecossistema_nibo:  { type: Type.STRING },
                    nota_universo_contabil: { type: Type.NUMBER }, porque_universo_contabil: { type: Type.STRING }, melhoria_universo_contabil: { type: Type.STRING },

                    tempo_fala_cs:      { type: Type.STRING },
                    tempo_fala_cliente: { type: Type.STRING },

                    checklist_cs: {
                        type: Type.OBJECT,
                        properties: {
                            definiu_prazo_implementacao:   { type: Type.BOOLEAN },
                            alinhou_dever_de_casa:         { type: Type.BOOLEAN },
                            validou_certificado_digital:   { type: Type.BOOLEAN },
                            agendou_proximo_passo:         { type: Type.BOOLEAN },
                            conectou_com_dor_vendas:       { type: Type.BOOLEAN },
                            explicou_canal_suporte:        { type: Type.BOOLEAN }
                        }
                    },

                    pontos_fortes:  { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: [
                    "media_final","resumo_executivo","saude_cliente","risco_churn","sistemas_citados",
                    "nota_consultividade","porque_consultividade","melhoria_consultividade",
                    "nota_escuta_ativa","porque_escuta_ativa","melhoria_escuta_ativa",
                    "nota_jornada_cliente","porque_jornada_cliente","melhoria_jornada_cliente",
                    "nota_encantamento","porque_encantamento","melhoria_encantamento",
                    "nota_objecoes","porque_objecoes","melhoria_objecoes",
                    "nota_rapport","porque_rapport","melhoria_rapport",
                    "nota_autoridade","porque_autoridade","melhoria_autoridade",
                    "nota_postura","porque_postura","melhoria_postura",
                    "nota_gestao_tempo","porque_gestao_tempo","melhoria_gestao_tempo",
                    "nota_contextualizacao","porque_contextualizacao","melhoria_contextualizacao",
                    "nota_clareza","porque_clareza","melhoria_clareza",
                    "nota_objetividade","porque_objetividade","melhoria_objetividade",
                    "nota_flexibilidade","porque_flexibilidade","melhoria_flexibilidade",
                    "nota_dominio_produto","porque_dominio_produto","melhoria_dominio_produto",
                    "nota_dominio_negocio","porque_dominio_negocio","melhoria_dominio_negocio",
                    "nota_ecossistema_nibo","porque_ecossistema_nibo","melhoria_ecossistema_nibo",
                    "nota_universo_contabil","porque_universo_contabil","melhoria_universo_contabil",
                    "tempo_fala_cs","tempo_fala_cliente","checklist_cs","pontos_fortes","pontos_atencao"
                ]
            }
        }
    });
    return JSON.parse(res.text);
}

// ─── CHAMADA B: Relatório markdown — chamada separada, output livre ────────────
async function getReport(content, scores) {
    // Passa o resumo estruturado das notas + o conteúdo para o relatório ser coerente
    const scoresSummary = Object.entries(scores)
        .filter(([k]) => k.startsWith('nota_'))
        .map(([k, v]) => `${k.replace('nota_', '')}: ${v}`)
        .join(', ');

    const prompt = `Com base no conteúdo abaixo e nas notas já atribuídas (${scoresSummary}),
escreva um relatório detalhado de auditoria de CS em Markdown.

Estrutura obrigatória:
## Visão Geral
## Análise por Pilar (comente os destaques positivos e negativos)
## Pontos Críticos de Atenção
## Plano de Ação Recomendado

Seja específico, cite comportamentos observados. Escreva para um gestor de CS.

CONTEÚDO DA REUNIÃO:
${content}`;

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Você é auditor sênior de CS do Nibo. Escreva apenas o relatório em Markdown puro, sem JSON.`
        }
    });
    return res.text;
}

// ─── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Transcrição obrigatória.' });
    }

    try {
        // Passo 1 — comprime se longa (>12k chars ~2000 palavras)
        const isLong = prompt.length > 12000;
        const content = isLong ? await compressTranscript(prompt) : prompt;

        // Passos 2A e 2B — executam em PARALELO para ganhar tempo
        const [scores, report] = await Promise.all([
            getScores(content),
            getReport(content, {}) // scores ainda não disponíveis, passa vazio no paralelo
        ]);

        // Monta resposta final
        return res.status(200).json({
            ...scores,
            justificativa_detalhada: report,
            _compressed: isLong
        });

    } catch (error) {
        console.error('Erro na API:', error);

        // Mensagem de erro amigável por tipo de falha
        if (error.message?.includes('parse') || error.message?.includes('JSON')) {
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro do Google Gemini: ' + error.message });
    }
}
