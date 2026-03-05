import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── CHAMADA A: Notas + justificativas curtas + meta-dados (JSON estruturado) ─
// O Gemini 2.5 Flash suporta até 1M tokens de entrada — mandamos a transcrição completa sempre.
async function getScores(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 6000,
            systemInstruction: `Você é auditor sênior de CS do Nibo. Leia a transcrição completa e dê notas de 1 a 5 para os 17 pilares abaixo.

REGRA CRÍTICA — AUSÊNCIA DE EVIDÊNCIA:
Se um pilar NÃO tiver nenhuma evidência observável na transcrição (o tema simplesmente não apareceu),
retorne nota = null, porque = "Sem evidência na transcrição." e melhoria = null.
NÃO invente nota, NÃO assuma comportamento, NÃO dê nota baixa por ausência.
Nota null significa "não avaliado", não "ruim".

Se houver evidência (mesmo parcial), dê uma nota de 1 a 5:
- motivo em ATÉ 1 FRASE direta e específica (cite o que aconteceu na reunião)
- o que faltou para 5 em ATÉ 1 FRASE (se nota = 5, escreva "Critério de excelência atingido.")

Pilares:
1. Consultividade: agiu como consultor, orientou além do básico?
2. Escuta Ativa: prestou atenção genuína às dúvidas e sinais do cliente?
3. Jornada do Cliente: mapeou e alinhou etapas da implementação com clareza?
4. Encantamento: criou momentos memoráveis que surpreenderam positivamente?
5. Objeções/Bugs: tratou resistências técnicas, erros e dificuldades com eficácia?
6. Rapport: criou conexão humana, empatia e parceria com o cliente?
7. Autoridade: demonstrou domínio e credibilidade que transmite segurança?
8. Postura: foi profissional, proativo e presente durante toda a reunião?
9. Gestão de Tempo: controlou o ritmo e aproveitou bem o tempo disponível?
10. Contextualização: conectou o produto à realidade do negócio do cliente?
11. Clareza: comunicou de forma objetiva e didática, sem jargões?
12. Objetividade: focou no essencial, sem dispersão?
13. Flexibilidade: adaptou-se ao ritmo e nível técnico do cliente?
14. Domínio de Produto: demonstrou profundidade técnica no Nibo?
15. Domínio de Negócio: entendeu o contexto contábil/financeiro do cliente?
16. Ecossistema Nibo: apresentou integrações, parceiros e recursos do ecossistema?
17. Universo Contábil: demonstrou conhecimento das práticas e fluxos contábeis?

A média final (media_final) deve ser calculada APENAS sobre os pilares com nota numérica — ignore nulls.`,
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
    return JSON.parse(res.text);
}

// ─── CHAMADA B: Relatório focado no analista de CS — para o coordenador ───────
async function getReport(transcript, scores) {
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

Notas já atribuídas por pilar:
${scoresBlock}

Média final (apenas pilares avaliados): ${scores.media_final ?? '?'}/5
Saúde do cliente: ${scores.saude_cliente ?? ''}
Risco de churn: ${scores.risco_churn ?? ''}

IMPORTANTE: Pilares marcados como "Não avaliado" não tiveram evidência — não os mencione.
Foque apenas nos pilares que foram avaliados com nota numérica.

Escreva um relatório em Markdown direcionado ao COORDENADOR, com linguagem direta e prática:
1. Falar SOBRE o analista — comportamentos concretos observados na reunião
2. Trazer falas ou momentos REAIS da transcrição como evidência
3. Indicar EXATAMENTE o que falar no próximo 1:1 — frases prontas
4. Plano de ação INDIVIDUAL com no máximo 3 prioridades (ação + prazo + métrica)

## O que o analista fez bem
## O que precisa melhorar
## O que falar no 1:1
## Plano de ação individual

TRANSCRIÇÃO COMPLETA:
${transcript}`;

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Você é coordenador sênior de CS do Nibo escrevendo feedback acionável sobre seu analista.
Escreva apenas o relatório em Markdown puro. Sem introduções, sem JSON, sem meta-comentários.
Use evidências concretas e diretas da transcrição. Seja objetivo como um bom líder num 1:1.
Não mencione pilares sem evidência.`
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
        // Sem compressão — Gemini 2.5 Flash lê até 1M tokens de entrada
        // Chamadas sequenciais: getReport usa as notas do getScores para ser coerente
        const scores = await getScores(prompt);
        const report = await getReport(prompt, scores);

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
