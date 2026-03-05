import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: {
        bodyParser: { sizeLimit: '20mb' }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_SCORES = `Você é auditor sênior de CS do Nibo.

REGRA DE AUSÊNCIA: Se um pilar não tiver evidência observável, retorne nota = null,
porque = "Sem evidência." e melhoria = null. Nunca invente nota.

Para pilares COM evidência: nota 1-5, porque em até 12 palavras, melhoria em até 12 palavras.
Se nota=5 em melhoria escreva: "Excelência atingida."
SEJA CONCISO — os textos devem ser curtíssimos.`;

function safeJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('JSON truncado, tamanho:', text?.length, '| fim:', text?.slice(-100));
        throw new Error('TRUNCATED_JSON');
    }
}

// ─── CHAMADA A1: Pilares 1–9 + meta-dados ────────────────────────────────────
async function getScoresA(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            systemInstruction: SYSTEM_SCORES,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_parcial_a:  { type: Type.NUMBER },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tempo_fala_cs:    { type: Type.STRING },
                    tempo_fala_cliente: { type: Type.STRING },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
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
                    // Pilares 1–9
                    nota_consultividade:   { type: Type.NUMBER, nullable: true }, porque_consultividade:   { type: Type.STRING }, melhoria_consultividade:   { type: Type.STRING, nullable: true },
                    nota_escuta_ativa:     { type: Type.NUMBER, nullable: true }, porque_escuta_ativa:     { type: Type.STRING }, melhoria_escuta_ativa:     { type: Type.STRING, nullable: true },
                    nota_jornada_cliente:  { type: Type.NUMBER, nullable: true }, porque_jornada_cliente:  { type: Type.STRING }, melhoria_jornada_cliente:  { type: Type.STRING, nullable: true },
                    nota_encantamento:     { type: Type.NUMBER, nullable: true }, porque_encantamento:     { type: Type.STRING }, melhoria_encantamento:     { type: Type.STRING, nullable: true },
                    nota_objecoes:         { type: Type.NUMBER, nullable: true }, porque_objecoes:         { type: Type.STRING }, melhoria_objecoes:         { type: Type.STRING, nullable: true },
                    nota_rapport:          { type: Type.NUMBER, nullable: true }, porque_rapport:          { type: Type.STRING }, melhoria_rapport:          { type: Type.STRING, nullable: true },
                    nota_autoridade:       { type: Type.NUMBER, nullable: true }, porque_autoridade:       { type: Type.STRING }, melhoria_autoridade:       { type: Type.STRING, nullable: true },
                    nota_postura:          { type: Type.NUMBER, nullable: true }, porque_postura:          { type: Type.STRING }, melhoria_postura:          { type: Type.STRING, nullable: true },
                    nota_gestao_tempo:     { type: Type.NUMBER, nullable: true }, porque_gestao_tempo:     { type: Type.STRING }, melhoria_gestao_tempo:     { type: Type.STRING, nullable: true },
                },
                required: [
                    "media_parcial_a","resumo_executivo","saude_cliente","risco_churn","sistemas_citados",
                    "tempo_fala_cs","tempo_fala_cliente","pontos_fortes","pontos_atencao","checklist_cs",
                    "nota_consultividade","porque_consultividade","melhoria_consultividade",
                    "nota_escuta_ativa","porque_escuta_ativa","melhoria_escuta_ativa",
                    "nota_jornada_cliente","porque_jornada_cliente","melhoria_jornada_cliente",
                    "nota_encantamento","porque_encantamento","melhoria_encantamento",
                    "nota_objecoes","porque_objecoes","melhoria_objecoes",
                    "nota_rapport","porque_rapport","melhoria_rapport",
                    "nota_autoridade","porque_autoridade","melhoria_autoridade",
                    "nota_postura","porque_postura","melhoria_postura",
                    "nota_gestao_tempo","porque_gestao_tempo","melhoria_gestao_tempo",
                ]
            }
        }
    });
    return safeJson(res.text);
}

// ─── CHAMADA A2: Pilares 10–17 ────────────────────────────────────────────────
async function getScoresB(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            systemInstruction: SYSTEM_SCORES,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_parcial_b: { type: Type.NUMBER },
                    // Pilares 10–17
                    nota_contextualizacao:  { type: Type.NUMBER, nullable: true }, porque_contextualizacao:  { type: Type.STRING }, melhoria_contextualizacao:  { type: Type.STRING, nullable: true },
                    nota_clareza:           { type: Type.NUMBER, nullable: true }, porque_clareza:           { type: Type.STRING }, melhoria_clareza:           { type: Type.STRING, nullable: true },
                    nota_objetividade:      { type: Type.NUMBER, nullable: true }, porque_objetividade:      { type: Type.STRING }, melhoria_objetividade:      { type: Type.STRING, nullable: true },
                    nota_flexibilidade:     { type: Type.NUMBER, nullable: true }, porque_flexibilidade:     { type: Type.STRING }, melhoria_flexibilidade:     { type: Type.STRING, nullable: true },
                    nota_dominio_produto:   { type: Type.NUMBER, nullable: true }, porque_dominio_produto:   { type: Type.STRING }, melhoria_dominio_produto:   { type: Type.STRING, nullable: true },
                    nota_dominio_negocio:   { type: Type.NUMBER, nullable: true }, porque_dominio_negocio:   { type: Type.STRING }, melhoria_dominio_negocio:   { type: Type.STRING, nullable: true },
                    nota_ecossistema_nibo:  { type: Type.NUMBER, nullable: true }, porque_ecossistema_nibo:  { type: Type.STRING }, melhoria_ecossistema_nibo:  { type: Type.STRING, nullable: true },
                    nota_universo_contabil: { type: Type.NUMBER, nullable: true }, porque_universo_contabil: { type: Type.STRING }, melhoria_universo_contabil: { type: Type.STRING, nullable: true },
                },
                required: [
                    "media_parcial_b",
                    "nota_contextualizacao","porque_contextualizacao","melhoria_contextualizacao",
                    "nota_clareza","porque_clareza","melhoria_clareza",
                    "nota_objetividade","porque_objetividade","melhoria_objetividade",
                    "nota_flexibilidade","porque_flexibilidade","melhoria_flexibilidade",
                    "nota_dominio_produto","porque_dominio_produto","melhoria_dominio_produto",
                    "nota_dominio_negocio","porque_dominio_negocio","melhoria_dominio_negocio",
                    "nota_ecossistema_nibo","porque_ecossistema_nibo","melhoria_ecossistema_nibo",
                    "nota_universo_contabil","porque_universo_contabil","melhoria_universo_contabil",
                ]
            }
        }
    });
    return safeJson(res.text);
}

// ─── Calcula média final ignorando nulls ──────────────────────────────────────
function calcMedia(merged) {
    const keys = [
        'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
        'rapport','autoridade','postura','gestao_tempo','contextualizacao','clareza',
        'objetividade','flexibilidade','dominio_produto','dominio_negocio',
        'ecossistema_nibo','universo_contabil'
    ];
    const notas = keys.map(k => merged[`nota_${k}`]).filter(n => n !== null && n !== undefined);
    if (!notas.length) return 0;
    return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
}

// ─── CHAMADA B: Relatório para o coordenador — recebe só scores (payload mínimo) ──
async function getReport(scores) {
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
            if (nota === null || nota === undefined) return null;
            const pq = scores[`porque_${k}`] ?? '';
            const ml = scores[`melhoria_${k}`] ?? '';
            return `- **${label}**: ${nota}/5 — ${pq}${ml && ml !== 'Excelência atingida.' ? ` | Melhoria: ${ml}` : ''}`;
        })
        .filter(Boolean)
        .join('\n');

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Coordenador de CS do Nibo — escreva feedback sobre o analista.

NOTAS:
${scoresBlock}

Média: ${scores.media_final}/5 | Saúde: ${scores.saude_cliente ?? ''} | Churn: ${scores.risco_churn ?? ''}
Fortes: ${(scores.pontos_fortes || []).join('; ')}
Atenção: ${(scores.pontos_atencao || []).join('; ')}

## O que o analista fez bem
## O que precisa melhorar
## O que falar no 1:1
## Plano de ação individual`,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Coordenador sênior de CS do Nibo. Markdown puro, direto, sem rodeios.
"O que falar no 1:1": frases prontas para usar literalmente.
"Plano de ação": máx 3 prioridades com ação + prazo + métrica.
Só mencione pilares com nota numérica.`
        }
    });
    return res.text;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Transcrição obrigatória.' });
    }

    try {
        // Pilares 1-9 e 10-17 em paralelo — cada chamada tem output pequeno e não trunca
        const [scoresA, scoresB] = await Promise.all([
            getScoresA(prompt),
            getScoresB(prompt)
        ]);

        // Mescla os dois resultados
        const merged = { ...scoresA, ...scoresB };
        merged.media_final = calcMedia(merged);

        // Relatório usa só os scores (sem reenviar transcrição)
        const report = await getReport(merged);

        return res.status(200).json({
            ...merged,
            justificativa_detalhada: report
        });

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message === 'TRUNCATED_JSON') {
            return res.status(500).json({ error: 'Erro ao gerar análise. Tente novamente.' });
        }
        if (error.message?.includes('parse') || error.message?.includes('JSON')) {
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
