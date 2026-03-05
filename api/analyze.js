import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

// ─── Aumenta o limite do body para 20MB (padrão Next.js é 1MB) ───────────────
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb'
        }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── CHAMADA A: Lê a transcrição UMA VEZ — retorna notas + citações-chave ────
// As citações são usadas pela Chamada B, evitando reenviar a transcrição inteira.
async function getScores(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 7000,
            systemInstruction: `Você é auditor sênior de CS do Nibo. Leia a transcrição completa e:

1. Dê notas de 1 a 5 para os 17 pilares abaixo.
2. Extraia até 6 citações ou momentos concretos da reunião que melhor representam a performance do analista (campo "citacoes_chave"). Essas citações serão usadas para gerar o relatório de feedback — escolha momentos específicos, positivos E negativos.

REGRA CRÍTICA — AUSÊNCIA DE EVIDÊNCIA:
Se um pilar NÃO tiver nenhuma evidência observável, retorne nota = null, porque = "Sem evidência na transcrição." e melhoria = null.
NÃO invente nota. Nota null = "não avaliado", não "ruim".

Se houver evidência, dê nota de 1 a 5:
- motivo em ATÉ 1 FRASE específica (cite o que aconteceu)
- o que faltou para 5 em ATÉ 1 FRASE (se nota = 5: "Critério de excelência atingido.")

Pilares:
1. Consultividade  2. Escuta Ativa  3. Jornada do Cliente  4. Encantamento  5. Objeções/Bugs
6. Rapport  7. Autoridade  8. Postura  9. Gestão de Tempo  10. Contextualização
11. Clareza  12. Objetividade  13. Flexibilidade  14. Domínio de Produto
15. Domínio de Negócio  16. Ecossistema Nibo  17. Universo Contábil

média final = média APENAS dos pilares com nota numérica (ignore nulls).`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:      { type: Type.NUMBER },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },

                    // Citações-chave extraídas para o relatório (evita reenviar transcrição)
                    citacoes_chave: { type: Type.ARRAY, items: { type: Type.STRING } },

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
                    "media_final","resumo_executivo","saude_cliente","risco_churn","sistemas_citados","citacoes_chave",
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

// ─── CHAMADA B: Relatório para o coordenador — usa scores + citações, SEM reenviar transcrição ──
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
            const pq   = scores[`porque_${k}`] ?? '';
            const ml   = scores[`melhoria_${k}`] ?? '';
            if (nota === null || nota === undefined) return null; // omite pilares sem evidência
            return `- **${label}**: ${nota}/5 — ${pq}${ml && ml !== 'Critério de excelência atingido.' ? ` | Melhoria: ${ml}` : ''}`;
        })
        .filter(Boolean)
        .join('\n');

    const citacoes = (scores.citacoes_chave || [])
        .map((c, i) => `${i + 1}. "${c}"`)
        .join('\n');

    const prompt = `Você é coordenador experiente de CS do Nibo. Com base nas notas e citações abaixo, escreva um relatório de feedback sobre o seu analista de CS.

NOTAS POR PILAR (apenas avaliados):
${scoresBlock}

Média final: ${scores.media_final ?? '?'}/5
Saúde do cliente: ${scores.saude_cliente ?? ''}
Risco de churn: ${scores.risco_churn ?? ''}

MOMENTOS CONCRETOS EXTRAÍDOS DA REUNIÃO:
${citacoes || 'Nenhuma citação disponível.'}

PONTOS FORTES IDENTIFICADOS: ${(scores.pontos_fortes || []).join(' | ')}
PONTOS DE ATENÇÃO: ${(scores.pontos_atencao || []).join(' | ')}

Escreva o relatório com esta estrutura obrigatória:

## O que o analista fez bem
(use os momentos concretos acima como evidência — seja específico)

## O que precisa melhorar
(foque nos pilares com nota abaixo de 4 — explique o impacto no cliente)

## O que falar no 1:1
(frases prontas que o coordenador pode usar literalmente — direto ao ponto)

## Plano de ação individual
(máximo 3 prioridades — ação concreta + prazo + como medir)`;

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Você é coordenador sênior de CS do Nibo escrevendo feedback acionável sobre seu analista.
Markdown puro. Sem introduções, sem meta-comentários, sem JSON.
Linguagem direta e humana — como um bom líder fala num 1:1.
Só mencione pilares que foram avaliados com nota numérica.`
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
        // Passo 1: lê a transcrição inteira UMA VEZ e extrai notas + citações-chave
        const scores = await getScores(prompt);

        // Passo 2: gera o relatório usando APENAS scores + citações (sem reenviar transcrição)
        const report = await getReport(scores);

        return res.status(200).json({
            ...scores,
            justificativa_detalhada: report
        });

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message?.includes('parse') || error.message?.includes('JSON')) {
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro do Google Gemini: ' + error.message });
    }
}
