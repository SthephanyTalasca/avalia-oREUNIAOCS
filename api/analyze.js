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
Se um pilar não tiver nenhuma evidência observável na transcrição, escreva explicitamente: "Sem evidência."
Ao final: sistemas citados, % estimado de fala CS vs cliente,
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
            systemInstruction: `Você é auditor sênior de CS do Nibo. Avalie o conteúdo e dê notas de 1 a 5 para os 17 pilares.

REGRA CRÍTICA — AUSÊNCIA DE EVIDÊNCIA:
Se um pilar NÃO tiver nenhuma evidência observável na transcrição (o tema simplesmente não apareceu),
retorne nota = null, porque = "Sem evidência na transcrição." e melhoria = null.
NÃO invente nota, NÃO assuma comportamento, NÃO dê nota baixa por ausência.
Nota null significa "não avaliado", não "ruim".

Se houver evidência (mesmo parcial), aí sim dê uma nota de 1 a 5:
- motivo em ATÉ 1 FRASE
- o que faltou para 5 em ATÉ 1 FRASE (se nota = 5, escreva "Critério de excelência atingido.")

A média final (media_final) deve ser calculada APENAS sobre os pilares que tiverem nota numérica — ignore os nulls.`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:      { type: Type.NUMBER },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },

                    // Notas podem ser NUMBER ou null — schema aceita ambos via nullable
                    nota_consultividade:    { type: Type.NUMBER, nullable: true }, porque_consultividade:    { type: Type.STRING }, melhoria_consultividade:    { type: Type.STRING, nullable: true },
                    nota_escuta_ativa:      { type: Type.NUMBER, nullable: true }, porque_escuta_ativa:      { type: Type.STRING }, melhoria_escuta_ativa:      { type: Type.STRING, nullable: true },
                    nota_jornada_cliente:   { type: Type.NUMBER, nullable: true }, porque_jornada_cliente:   { type: Type.STRING }, melhoria_jornada_cliente:   { type: Type.STRING, nullable: true },
                    nota_encantamento:      { type: Type.NUMBER, nullable: true }, porque_encantamento:      { type: Type.STRING }, melhoria_encantamento:      { type: Type.STRING, nullable: true },
                    nota_objecoes:          { type: Type.NUMBER, nullable: true }, porque_objecoes:          { type: Type.STRING }, melhoria_objecoes:          { type: Type.STRING, nullable: true },
                    nota_rapport:           { type: Type.NUMBER, nullable: true }, porque_rapport:           { type: Type.STRING }, melhoria_rapport:           { type: Type.STRING, nullable: true },
                    nota_autoridade:        { type: Type.NUMBER, nullable: true }, porque_autoridade:        { type: Type.STRING }, melhoria_autoridade:        { type: Type.STRING, nullable: true },
                    nota_postura:           { type: Type.NUMBER, nullable: true }, porque_postura:           { type: Type.STRING }, melhoria_postura:           { type: Type.STRING, nullable: true },
                    nota_gestao_tempo:      { type: Type.NUMBER, nullable: true }, porque_gestao_tempo:      { type: Type.STRING }, melhoria_gestao_tempo:      { type: Type.STRING, nullable: true },
                    nota_contextualizacao:  { type: Type.NUMBER, nullable: true }, porque_contextualizacao:  { type: Type.STRING }, melhoria_contextualizacao:  { type: Type.STRING, nullable: true },
                    nota_clareza:           { type: Type.NUMBER, nullable: true }, porque_clareza:           { type: Type.STRING }, melhoria_clareza:           { type: Type.STRING, nullable: true },
                    nota_objetividade:      { type: Type.NUMBER, nullable: true }, porque_objetividade:      { type: Type.STRING }, melhoria_objetividade:      { type: Type.STRING, nullable: true },
                    nota_flexibilidade:     { type: Type.NUMBER, nullable: true }, porque_flexibilidade:     { type: Type.STRING }, melhoria_flexibilidade:     { type: Type.STRING, nullable: true },
                    nota_dominio_produto:   { type: Type.NUMBER, nullable: true }, porque_dominio_produto:   { type: Type.STRING }, melhoria_dominio_produto:   { type: Type.STRING, nullable: true },
                    nota_dominio_negocio:   { type: Type.NUMBER, nullable: true }, porque_dominio_negocio:   { type: Type.STRING }, melhoria_dominio_negocio:   { type: Type.STRING, nullable: true },
                    nota_ecossistema_nibo:  { type: Type.NUMBER, nullable: true }, porque_ecossistema_nibo:  { type: Type.STRING }, melhoria_ecossistema_nibo:  { type: Type.STRING, nullable: true },
                    nota_universo_contabil: { type: Type.NUMBER, nullable: true }, porque_universo_contabil: { type: Type.STRING }, melhoria_universo_contabil: { type: Type.STRING, nullable: true },

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

// ─── CHAMADA B: Relatório focado no analista de CS — para o coordenador ───────
async function getReport(content, scores) {
    const pillarNames = {
        consultividade: 'Consultividade', escuta_ativa: 'Escuta Ativa', jornada_cliente: 'Jornada do Cliente',
        encantamento: 'Encantamento', objecoes: 'Objeções/Bugs', rapport: 'Rapport',
        autoridade: 'Autoridade', postura: 'Postura', gestao_tempo: 'Gestão de Tempo',
        contextualizacao: 'Contextualização', clareza: 'Clareza', objetividade: 'Objetividade',
        flexibilidade: 'Flexibilidade', dominio_produto: 'Domínio de Produto',
        dominio_negocio: 'Domínio de Negócio', ecossistema_nibo: 'Ecossistema Nibo',
        universo_contabil: 'Universo Contábil'
    };

    const scoresBlock = Object.entries(pillarNames)
        .map(([k, label]) => {
            const nota = scores[`nota_${k}`];
            const pq   = scores[`porque_${k}`] ?? '';
            const ml   = scores[`melhoria_${k}`] ?? '';
            if (nota === null || nota === undefined) {
                return `- **${label}**: Não avaliado (sem evidência na transcrição)`;
            }
            return `- **${label}**: ${nota}/5 — ${pq}${ml && ml !== 'Critério de excelência atingido.' ? ` | Melhoria: ${ml}` : ''}`;
        })
        .join('\n');

    const prompt = `Você é um coordenador experiente de Customer Success do Nibo analisando a performance do seu analista de CS nesta reunião de Onboarding.

Abaixo estão as notas e justificativas já atribuídas para cada pilar:
${scoresBlock}

Média final (apenas pilares avaliados): ${scores.media_final ?? '?'}/5
Saúde do cliente: ${scores.saude_cliente ?? ''}
Risco de churn: ${scores.risco_churn ?? ''}

IMPORTANTE: Pilares marcados como "Não avaliado" não tiveram evidência na reunião — não os critique nem os elogie. Foque apenas nos que foram avaliados.

Com base no conteúdo da reunião e nas notas acima, escreva um relatório em Markdown direcionado ao COORDENADOR de CS, com linguagem direta e prática. O relatório deve:

1. Falar SOBRE o analista — o que ele fez bem, o que deixou a desejar, como ele se comportou com o cliente
2. Trazer falas ou momentos CONCRETOS da reunião como evidência (cite trechos ou situações reais)
3. Indicar EXATAMENTE o que o coordenador deve falar com o analista no próximo 1:1 — frases prontas que o coordenador pode usar
4. Propor um plano de ação INDIVIDUAL para o analista com no máximo 3 prioridades, cada uma com ação concreta, prazo e como medir

Use esta estrutura obrigatória em Markdown:

## O que o analista fez bem
(cite comportamentos e momentos específicos da reunião — seja concreto, não genérico)

## O que precisa melhorar
(cite os pilares com nota abaixo de 4 — explique o impacto no cliente e na retenção)

## O que falar no 1:1
(escreva como se fosse o coordenador falando diretamente — frases reais, sem rodeios)

## Plano de ação individual
(3 prioridades no máximo — ação, prazo e métrica)

Seja direto, humano e orientado a resultado. Nada de linguagem genérica ou acadêmica.

CONTEÚDO DA REUNIÃO:
${content}`;

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Você é coordenador sênior de CS do Nibo escrevendo feedback acionável sobre seu analista.
Escreva apenas o relatório em Markdown puro. Sem introduções, sem JSON, sem meta-comentários sobre a análise.
Use evidências concretas da reunião. Seja direto como um bom líder seria num 1:1.
Não mencione nem avalie pilares que não tiveram evidência na transcrição.`
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
        const isLong = prompt.length > 12000;
        const content = isLong ? await compressTranscript(prompt) : prompt;

        const scores = await getScores(content);
        const report = await getReport(content, scores);

        return res.status(200).json({
            ...scores,
            justificativa_detalhada: report,
            _compressed: isLong
        });

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message?.includes('parse') || error.message?.includes('JSON')) {
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro do Google Gemini: ' + error.message });
    }
}
