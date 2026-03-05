import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb'
        }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── CHAMADA A: Só as notas — JSON mínimo, sem texto longo ───────────────────
// Cada campo de texto é 1 frase curta → output cabe folgado em 4000 tokens.
async function getScores(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction: `Você é auditor sênior de CS do Nibo. Leia a transcrição e avalie os 17 pilares.

REGRA DE AUSÊNCIA: Se um pilar não tiver evidência observável, retorne nota = null,
porque = "Sem evidência na transcrição." e melhoria = null. Nunca invente nota.

Para pilares COM evidência, dê nota 1-5 e escreva:
- porque_X: UMA frase curta (máximo 15 palavras) — o que aconteceu
- melhoria_X: UMA frase curta (máximo 15 palavras) — o que faltou para 5; se nota=5 escreva "Excelência atingida."

SEJA EXTREMAMENTE CONCISO nos textos. O JSON não pode ser cortado.

Pilares: consultividade, escuta_ativa, jornada_cliente, encantamento, objecoes,
rapport, autoridade, postura, gestao_tempo, contextualizacao, clareza, objetividade,
flexibilidade, dominio_produto, dominio_negocio, ecossistema_nibo, universo_contabil

media_final = média apenas dos pilares com nota numérica.`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:      { type: Type.NUMBER },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },

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

    // Se o JSON vier cortado, lança erro descritivo
    let parsed;
    try {
        parsed = JSON.parse(res.text);
    } catch (e) {
        console.error('JSON cortado, tamanho da resposta:', res.text?.length, 'chars');
        console.error('Trecho final:', res.text?.slice(-200));
        throw new Error('TRUNCATED_JSON');
    }
    return parsed;
}

// ─── CHAMADA B: Relatório + citações — texto livre, sem schema JSON ───────────
// Recebe apenas as notas (payload pequeno), sem reenviar a transcrição.
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

    const prompt = `Coordenador de CS do Nibo — escreva feedback sobre o analista desta reunião.

NOTAS (pilares avaliados):
${scoresBlock}

Média: ${scores.media_final ?? '?'}/5 | Saúde: ${scores.saude_cliente ?? ''} | Churn: ${scores.risco_churn ?? ''}
Fortes: ${(scores.pontos_fortes || []).join('; ')}
Atenção: ${(scores.pontos_atencao || []).join('; ')}

Escreva em Markdown com estas 4 seções:

## O que o analista fez bem
## O que precisa melhorar
## O que falar no 1:1
## Plano de ação individual`;

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Coordenador sênior de CS do Nibo. Markdown puro, direto, sem rodeios.
"O que falar no 1:1": frases prontas para o coordenador usar literalmente.
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
        const scores = await getScores(prompt);
        const report = await getReport(scores);

        return res.status(200).json({
            ...scores,
            justificativa_detalhada: report
        });

    } catch (error) {
        console.error('Erro na API:', error);

        if (error.message === 'TRUNCATED_JSON') {
            return res.status(500).json({
                error: 'A transcrição é muito longa para ser processada de uma vez. Tente dividir em partes de até 60 minutos.'
            });
        }
        if (error.message?.includes('parse') || error.message?.includes('JSON')) {
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
