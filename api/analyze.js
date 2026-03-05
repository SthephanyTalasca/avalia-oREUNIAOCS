import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: {
        bodyParser: { sizeLimit: '20mb' }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── CHAMADA 1: SÓ NÚMEROS E BOOLEANOS — JSON nunca trunca ───────────────────
// Texto = caracteres variáveis que explodem o output. Números/booleanos = tamanho fixo.
async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction: `Você é auditor de CS do Nibo. Leia a transcrição e retorne APENAS números e booleanos.

Para cada pilar, retorne a nota de 1 a 5. Se não houver NENHUMA evidência observável do pilar na transcrição, retorne -1 (significa "sem evidência").

Pilares: consultividade, escuta_ativa, jornada_cliente, encantamento, objecoes, rapport,
autoridade, postura, gestao_tempo, contextualizacao, clareza, objetividade, flexibilidade,
dominio_produto, dominio_negocio, ecossistema_nibo, universo_contabil

media_final = média apenas das notas que NÃO sejam -1.
tempo_fala_cs e tempo_fala_cliente = inteiro de 0 a 100 (percentual).`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:               { type: Type.NUMBER },
                    tempo_fala_cs_pct:         { type: Type.NUMBER },
                    tempo_fala_cliente_pct:    { type: Type.NUMBER },

                    nota_consultividade:    { type: Type.NUMBER },
                    nota_escuta_ativa:      { type: Type.NUMBER },
                    nota_jornada_cliente:   { type: Type.NUMBER },
                    nota_encantamento:      { type: Type.NUMBER },
                    nota_objecoes:          { type: Type.NUMBER },
                    nota_rapport:           { type: Type.NUMBER },
                    nota_autoridade:        { type: Type.NUMBER },
                    nota_postura:           { type: Type.NUMBER },
                    nota_gestao_tempo:      { type: Type.NUMBER },
                    nota_contextualizacao:  { type: Type.NUMBER },
                    nota_clareza:           { type: Type.NUMBER },
                    nota_objetividade:      { type: Type.NUMBER },
                    nota_flexibilidade:     { type: Type.NUMBER },
                    nota_dominio_produto:   { type: Type.NUMBER },
                    nota_dominio_negocio:   { type: Type.NUMBER },
                    nota_ecossistema_nibo:  { type: Type.NUMBER },
                    nota_universo_contabil: { type: Type.NUMBER },

                    ck_prazo:         { type: Type.BOOLEAN },
                    ck_dever_casa:    { type: Type.BOOLEAN },
                    ck_certificado:   { type: Type.BOOLEAN },
                    ck_proximo_passo: { type: Type.BOOLEAN },
                    ck_dor_vendas:    { type: Type.BOOLEAN },
                    ck_suporte:       { type: Type.BOOLEAN }
                },
                required: [
                    "media_final","tempo_fala_cs_pct","tempo_fala_cliente_pct",
                    "nota_consultividade","nota_escuta_ativa","nota_jornada_cliente",
                    "nota_encantamento","nota_objecoes","nota_rapport","nota_autoridade",
                    "nota_postura","nota_gestao_tempo","nota_contextualizacao","nota_clareza",
                    "nota_objetividade","nota_flexibilidade","nota_dominio_produto",
                    "nota_dominio_negocio","nota_ecossistema_nibo","nota_universo_contabil",
                    "ck_prazo","ck_dever_casa","ck_certificado","ck_proximo_passo","ck_dor_vendas","ck_suporte"
                ]
            }
        }
    });

    let parsed;
    try {
        parsed = JSON.parse(res.text);
    } catch(e) {
        console.error('Números JSON truncado:', res.text?.slice(-100));
        throw new Error('TRUNCATED_NUMBERS');
    }

    // Converte -1 para null (sem evidência)
    const keys = [
        'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
        'rapport','autoridade','postura','gestao_tempo','contextualizacao','clareza',
        'objetividade','flexibilidade','dominio_produto','dominio_negocio',
        'ecossistema_nibo','universo_contabil'
    ];
    keys.forEach(k => {
        if (parsed[`nota_${k}`] === -1) parsed[`nota_${k}`] = null;
    });

    // Formata percentuais como string
    parsed.tempo_fala_cs      = `${parsed.tempo_fala_cs_pct ?? 50}%`;
    parsed.tempo_fala_cliente = `${parsed.tempo_fala_cliente_pct ?? 50}%`;

    // Reconstrói checklist no formato que o frontend espera
    parsed.checklist_cs = {
        definiu_prazo_implementacao:   parsed.ck_prazo         ?? false,
        alinhou_dever_de_casa:         parsed.ck_dever_casa    ?? false,
        validou_certificado_digital:   parsed.ck_certificado   ?? false,
        agendou_proximo_passo:         parsed.ck_proximo_passo ?? false,
        conectou_com_dor_vendas:       parsed.ck_dor_vendas    ?? false,
        explicou_canal_suporte:        parsed.ck_suporte       ?? false
    };

    return parsed;
}

// ─── CHAMADA 2A: Justificativas dos pilares (com transcrição, output curto) ────
async function getJustificativas(transcript, numbers) {
    const pillarKeys = [
        ['consultividade','Consultividade'],['escuta_ativa','Escuta Ativa'],
        ['jornada_cliente','Jornada do Cliente'],['encantamento','Encantamento'],
        ['objecoes','Objeções/Bugs'],['rapport','Rapport'],['autoridade','Autoridade'],
        ['postura','Postura'],['gestao_tempo','Gestão de Tempo'],
        ['contextualizacao','Contextualização'],['clareza','Clareza'],
        ['objetividade','Objetividade'],['flexibilidade','Flexibilidade'],
        ['dominio_produto','Domínio de Produto'],['dominio_negocio','Domínio de Negócio'],
        ['ecossistema_nibo','Ecossistema Nibo'],['universo_contabil','Universo Contábil']
    ];

    const comNota = pillarKeys.filter(([k]) => numbers[`nota_${k}`] !== null);
    const notasBloco = comNota.map(([k, l]) => `${l}: ${numbers[`nota_${k}`]}/5`).join(', ');

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Auditor de CS do Nibo. Notas já calculadas: ${notasBloco}.

Para cada pilar listado abaixo, escreva exatamente no formato indicado (1 linha cada):

###RESUMO### Uma frase resumindo a reunião.
###SAUDE### Uma frase sobre saúde do cliente.
###CHURN### Uma frase sobre risco de churn.
###SISTEMAS### sistemas citados separados por vírgula, ou: nenhum
###FORTES### até 4 pontos fortes, um por linha começando com -
###ATENCAO### até 4 pontos de atenção, um por linha começando com -

${comNota.map(([k, label]) => `###${k.toUpperCase()}### Porque (máx 1 frase): ... | Melhoria (máx 1 frase): ...`).join('
')}

Seja MUITO CONCISO. Cada campo em uma linha. Não escreva mais do que o solicitado.`
        }
    });

    const raw = res.text ?? '';
    const get = (tag) => {
        const re = new RegExp(`###${tag}###\\s*([^\\n#][^\\n]*)`, 'i');
        return (raw.match(re)?.[1] ?? '').trim();
    };
    const getBlock = (tag) => {
        const re = new RegExp(`###${tag}###\\s*([\\s\\S]*?)(?=###|$)`, 'i');
        return (raw.match(re)?.[1] ?? '').trim();
    };

    const result = {
        resumo_executivo: get('RESUMO') || 'Reunião de onboarding avaliada.',
        saude_cliente:    get('SAUDE')  || 'N/A',
        risco_churn:      get('CHURN')  || 'N/A',
        sistemas_citados: (() => {
            const s = get('SISTEMAS');
            return (!s || s.toLowerCase() === 'nenhum') ? [] : s.split(',').map(x=>x.trim()).filter(Boolean);
        })(),
        pontos_fortes:  getBlock('FORTES').split('\n').map(s=>s.replace(/^-\s*/,'')).filter(Boolean),
        pontos_atencao: getBlock('ATENCAO').split('\n').map(s=>s.replace(/^-\s*/,'')).filter(Boolean),
    };

    // Parse porque/melhoria de cada pilar
    pillarKeys.forEach(([k]) => {
        if (numbers[`nota_${k}`] === null) {
            result[`porque_${k}`]   = 'Sem evidência na transcrição.';
            result[`melhoria_${k}`] = null;
            return;
        }
        const line = get(k.toUpperCase());
        const pq = line.match(/[Pp]orque[^:]*:\s*([^|]+)/)?.[1]?.trim() || 'Sem justificativa.';
        const ml = line.match(/[Mm]elhoria[^:]*:\s*(.+)/)?.[1]?.trim()  || 'Excelência atingida.';
        result[`porque_${k}`]   = pq.replace(/\.{3}$/, '').trim() || 'Sem justificativa.';
        result[`melhoria_${k}`] = ml.replace(/\.{3}$/, '').trim() || 'Excelência atingida.';
    });

    return result;
}

// ─── CHAMADA 2B: Relatório do coordenador (só notas, sem transcrição) ─────────
async function getRelatorio(numbers, texts) {
    const pillarNames = {
        consultividade:'Consultividade', escuta_ativa:'Escuta Ativa', jornada_cliente:'Jornada do Cliente',
        encantamento:'Encantamento', objecoes:'Objeções/Bugs', rapport:'Rapport',
        autoridade:'Autoridade', postura:'Postura', gestao_tempo:'Gestão de Tempo',
        contextualizacao:'Contextualização', clareza:'Clareza', objetividade:'Objetividade',
        flexibilidade:'Flexibilidade', dominio_produto:'Domínio de Produto',
        dominio_negocio:'Domínio de Negócio', ecossistema_nibo:'Ecossistema Nibo',
        universo_contabil:'Universo Contábil'
    };

    const scoresBlock = Object.entries(pillarNames)
        .map(([k, label]) => {
            const nota = numbers[`nota_${k}`];
            if (nota === null) return null;
            const pq = texts[`porque_${k}`] ?? '';
            const ml = texts[`melhoria_${k}`] ?? '';
            return `- **${label}**: ${nota}/5 — ${pq}${ml && ml !== 'Excelência atingida.' ? ` | Melhoria: ${ml}` : ''}`;
        })
        .filter(Boolean).join('\n');

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Coordenador de CS do Nibo — escreva feedback sobre seu analista.

NOTAS:
${scoresBlock}

Média: ${numbers.media_final}/5 | Saúde: ${texts.saude_cliente} | Churn: ${texts.risco_churn}
Fortes: ${(texts.pontos_fortes||[]).join('; ')}
Atenção: ${(texts.pontos_atencao||[]).join('; ')}

## O que o analista fez bem
## O que precisa melhorar
## O que falar no 1:1
## Plano de ação individual`,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: `Coordenador sênior de CS do Nibo. Markdown puro, linguagem direta.
"O que falar no 1:1": frases prontas para usar literalmente.
"Plano de ação": máx 3 prioridades com ação + prazo + métrica.
Só mencione pilares com nota numérica.`
        }
    });
    return res.text ?? '';
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
        // Passo 1: notas numéricas (JSON pequeno, fixo, nunca trunca)
        const numbers = await getNumbers(prompt);

        // Passo 2A: justificativas dos pilares
        const texts = await getJustificativas(prompt, numbers);

        // Passo 2B: relatório com as justificativas reais
        const justificativa_detalhada = await getRelatorio(numbers, texts);

        return res.status(200).json({
            ...numbers,
            ...texts,
            justificativa_detalhada
        });

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message === 'TRUNCATED_NUMBERS') {
            return res.status(500).json({ error: 'Erro ao calcular notas. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
