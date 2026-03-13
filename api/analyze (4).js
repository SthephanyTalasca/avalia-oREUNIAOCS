import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ALL_PILLARS = [
    ['consultividade',    'Consultividade'],
    ['escuta_ativa',      'Escuta Ativa'],
    ['jornada_cliente',   'Jornada do Cliente'],
    ['encantamento',      'Encantamento'],
    ['objecoes',          'Objeções/Bugs'],
    ['rapport',           'Rapport'],
    ['autoridade',        'Autoridade'],
    ['postura',           'Postura'],
    ['gestao_tempo',      'Gestão de Tempo'],
    ['contextualizacao',  'Contextualização'],
    ['clareza',           'Clareza'],
    ['objetividade',      'Objetividade'],
    ['flexibilidade',     'Flexibilidade'],
    ['dominio_produto',   'Domínio de Produto'],
    ['dominio_negocio',   'Domínio de Negócio'],
    ['ecossistema_nibo',  'Ecossistema Nibo'],
    ['universo_contabil', 'Universo Contábil'],
];

function repairJson(raw) {
    let s = (raw || '').trimEnd().replace(/,\s*$/, '').replace(/"[^"]*$/, '').replace(/:\s*$/, '').replace(/,\s*$/, '');
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') braces++; else if (ch === '}') braces--;
        else if (ch === '[') brackets++; else if (ch === ']') brackets--;
    }
    while (brackets > 0) { s += ']'; brackets--; }
    while (braces > 0) { s += '}'; braces--; }
    return s;
}

function safeParse(text, label) {
    try { return JSON.parse(text); } catch (_) {
        try { const r = JSON.parse(repairJson(text)); console.log(label + ' reparado'); return r; }
        catch (e2) { console.error(label + ' falhou:', (text || '').slice(-80)); throw new Error('JSON_FAIL_' + label); }
    }
}

function makeTextSchema(pairs) {
    const props = {}, req = [];
    pairs.forEach(p => {
        props['porque_'   + p[0]] = { type: Type.STRING };
        props['melhoria_' + p[0]] = { type: Type.STRING };
        req.push('porque_' + p[0], 'melhoria_' + p[0]);
    });
    return { type: Type.OBJECT, properties: props, required: req };
}

async function withRetry(fn, label, attempts = 3) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (e) {
            lastErr = e;
            console.error(label + ' tentativa ' + (i+1) + ':', e.message);
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw lastErr;
}

async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Leia a transcrição de implementação/onboarding. ' +
                'Para cada pilar retorne nota 1-5. Sem evidência = -1. ' +
                'media_final = média das notas diferentes de -1. ' +
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0-100.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:            { type: Type.NUMBER },
                    tempo_fala_cs_pct:      { type: Type.NUMBER },
                    tempo_fala_cliente_pct: { type: Type.NUMBER },
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
                    ck_prazo:               { type: Type.BOOLEAN },
                    ck_dever_casa:          { type: Type.BOOLEAN },
                    ck_certificado:         { type: Type.BOOLEAN },
                    ck_proximo_passo:       { type: Type.BOOLEAN },
                    ck_dor_vendas:          { type: Type.BOOLEAN },
                    ck_suporte:             { type: Type.BOOLEAN },
                },
                required: [
                    'media_final','tempo_fala_cs_pct','tempo_fala_cliente_pct',
                    'nota_consultividade','nota_escuta_ativa','nota_jornada_cliente',
                    'nota_encantamento','nota_objecoes','nota_rapport','nota_autoridade',
                    'nota_postura','nota_gestao_tempo','nota_contextualizacao','nota_clareza',
                    'nota_objetividade','nota_flexibilidade','nota_dominio_produto',
                    'nota_dominio_negocio','nota_ecossistema_nibo','nota_universo_contabil',
                    'ck_prazo','ck_dever_casa','ck_certificado','ck_proximo_passo','ck_dor_vendas','ck_suporte'
                ]
            }
        }
    });
    const parsed = safeParse(res.text, 'getNumbers');
    ALL_PILLARS.forEach(p => { if (parsed['nota_' + p[0]] === -1) parsed['nota_' + p[0]] = null; });
    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
    parsed.checklist_cs = {
        definiu_prazo_implementacao: parsed.ck_prazo         || false,
        alinhou_dever_de_casa:       parsed.ck_dever_casa    || false,
        validou_certificado_digital: parsed.ck_certificado   || false,
        agendou_proximo_passo:       parsed.ck_proximo_passo || false,
        conectou_com_dor_vendas:     parsed.ck_dor_vendas    || false,
        explicou_canal_suporte:      parsed.ck_suporte       || false,
    };
    return parsed;
}

async function getMeta(transcript, numbers) {
    const notasStr = ALL_PILLARS
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'analista_nome: nome do analista de CS que conduz a reunião. ' +
                'pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas. ' +
                'sistemas_citados: ferramentas/sistemas mencionados pelo cliente. ' +
                'resumo_executivo: 1 frase. saude_cliente: 1 frase. risco_churn: 1 frase.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analista_nome:    { type: Type.STRING },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['analista_nome','resumo_executivo','saude_cliente','risco_churn',
                           'sistemas_citados','pontos_fortes','pontos_atencao']
            }
        }
    });
    return safeParse(res.text, 'getMeta');
}

async function getTextsA(transcript, numbers) {
    const group = ALL_PILLARS.slice(0, 9);
    const notasStr = group.filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'Para pilares SEM evidência: porque = "Sem evidência na transcrição." e melhoria = "". ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5: "Excelência atingida.").',
            responseSchema: makeTextSchema(group)
        }
    });
    return safeParse(res.text, 'getTextsA');
}

async function getTextsB(transcript, numbers) {
    const group = ALL_PILLARS.slice(9);
    const notasStr = group.filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'Para pilares SEM evidência: porque = "Sem evidência na transcrição." e melhoria = "". ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5: "Excelência atingida.").',
            responseSchema: makeTextSchema(group)
        }
    });
    return safeParse(res.text, 'getTextsB');
}

async function getRelatorio(numbers, meta, texts) {
    const linhas = ALL_PILLARS.map(p => {
        const nota = numbers['nota_' + p[0]];
        if (nota === null) return null;
        const pq = texts['porque_' + p[0]] || '';
        const ml = texts['melhoria_' + p[0]] || '';
        const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
    }).filter(Boolean).join('\n');

    const prompt =
        'Coordenador de CS do Nibo — feedback sobre o analista desta reunião de implementação.\n\n' +
        'NOTAS:\n' + linhas + '\n\n' +
        'Média: ' + (numbers.media_final || '?') + '/5' +
        ' | Saúde: ' + (meta.saude_cliente || '') +
        ' | Churn: '  + (meta.risco_churn  || '') + '\n' +
        'Fortes: '  + (meta.pontos_fortes  || []).join('; ') + '\n' +
        'Atenção: ' + (meta.pontos_atencao || []).join('; ') + '\n\n' +
        '## O que o analista fez bem\n' +
        '## O que precisa melhorar\n' +
        '## O que falar no 1:1\n' +
        '## Plano de ação individual';

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction:
                'Coordenador sênior de CS do Nibo. Markdown puro, linguagem direta e humana. ' +
                '"O que falar no 1:1": frases prontas para usar literalmente. ' +
                '"Plano de ação": máx 3 prioridades com ação + prazo + métrica. ' +
                'Só mencione pilares com nota numérica.',
        }
    });
    return res.text || '';
}

function getSession(req) {
    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/nibo_cs_session=([^;]+)/);
    if (!match) return null;
    try {
        const s = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        if (s.exp && Date.now() > s.exp) return null;
        if (s.email.toLowerCase().split('@')[1] !== 'nibo.com.br') return null;
        return s;
    } catch { return null; }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado.' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Transcrição obrigatória.' });

    try {
        const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers');
        const [meta, textsA, textsB] = await Promise.all([
            withRetry(() => getMeta(prompt, numbers), 'getMeta'),
            withRetry(() => getTextsA(prompt, numbers), 'getTextsA'),
            withRetry(() => getTextsB(prompt, numbers), 'getTextsB'),
        ]);
        const texts = Object.assign({}, textsA, textsB);

        ALL_PILLARS.forEach(p => {
            if (numbers['nota_' + p[0]] === null) {
                texts['porque_'   + p[0]] = 'Sem evidência na transcrição.';
                texts['melhoria_' + p[0]] = null;
            } else {
                texts['porque_'   + p[0]] = texts['porque_'   + p[0]] || 'Sem justificativa disponível.';
                texts['melhoria_' + p[0]] = texts['melhoria_' + p[0]] || 'Excelência atingida.';
            }
        });

        meta.analista_nome    = meta.analista_nome    || 'Não identificado';
        meta.resumo_executivo = meta.resumo_executivo || 'Reunião de implementação realizada.';
        meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
        meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
        meta.sistemas_citados = meta.sistemas_citados || [];
        meta.pontos_fortes    = meta.pontos_fortes    || [];
        meta.pontos_atencao   = meta.pontos_atencao   || [];

        const justificativa_detalhada = await withRetry(
            () => getRelatorio(numbers, meta, texts), 'getRelatorio'
        );

        return res.status(200).json(
            Object.assign({}, numbers, meta, texts, { justificativa_detalhada })
        );
    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
