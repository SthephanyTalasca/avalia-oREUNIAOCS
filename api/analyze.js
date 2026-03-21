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

const CS_MAP = {
    'brayan santos': { nome: 'Brayan Santos', coordinator: 'Sayuri' },
    'camille vaz': { nome: 'Camille Vaz', coordinator: 'Sayuri' },
    'carolina miranda': { nome: 'Carolina Miranda', coordinator: 'Sayuri' },
    'isaque silva': { nome: 'Isaque Silva', coordinator: 'Sayuri' },
    'larissa mota': { nome: 'Larissa Mota', coordinator: 'Sayuri' },
    'nat vieira': { nome: 'Nat Vieira', coordinator: 'Sayuri' },
    'vinícius oliveira': { nome: 'Vinícius Oliveira', coordinator: 'Sayuri' },
    'vinicius oliveira': { nome: 'Vinícius Oliveira', coordinator: 'Sayuri' },
    'ana de battisti': { nome: 'Ana De Battisti', coordinator: 'Tayanara' },
    'ana battisti': { nome: 'Ana De Battisti', coordinator: 'Tayanara' },
    'denis silva': { nome: 'Denis Silva', coordinator: 'Tayanara' },
    'larissa teixeira': { nome: 'Larissa Teixeira', coordinator: 'Tayanara' },
    'lorrayne moreira': { nome: 'Lorrayne Moreira', coordinator: 'Tayanara' },
    'micaelle martins': { nome: 'Micaelle Martins', coordinator: 'Tayanara' },
    'sthephany talasca': { nome: 'Sthephany Talasca', coordinator: 'Tayanara' },
    'thais silva': { nome: 'Thais Silva', coordinator: 'Tayanara' },
    'willian martins': { nome: 'Willian Martins', coordinator: 'Tayanara' },
    'yuri santos': { nome: 'Yuri Santos', coordinator: 'Tayanara' },
    'aline almeida': { nome: 'Aline Almeida', coordinator: 'Michel' },
    'bianca kim': { nome: 'Bianca Kim', coordinator: 'Michel' },
    'jéssica barreiro': { nome: 'Jéssica Barreiro', coordinator: 'Michel' },
    'jessica barreiro': { nome: 'Jéssica Barreiro', coordinator: 'Michel' },
    'julia rodrigues': { nome: 'Julia Rodrigues', coordinator: 'Michel' },
    'maria fernanda': { nome: 'Maria Fernanda', coordinator: 'Michel' },
    'maryana alves': { nome: 'Maryana Alves', coordinator: 'Michel' },
    'rafaele oliveira': { nome: 'Rafaele Oliveira', coordinator: 'Michel' },
    'túlio morgado': { nome: 'Túlio Morgado', coordinator: 'Michel' },
    'tulio morgado': { nome: 'Túlio Morgado', coordinator: 'Michel' },
};

function detectAnalista(transcript) {
    const lower = transcript.toLowerCase();
    const sorted = Object.keys(CS_MAP).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (lower.includes(key)) return CS_MAP[key];
    }
    return null;
}

function parseDataReuniao(rawDate) {
    if (!rawDate) return null;
    const s = String(rawDate).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;

    const meses = {
        janeiro:1, jan:1, fevereiro:2, fev:2,
        março:3, mar:3, marco:3, abril:4, abr:4,
        maio:5, junho:6, jun:6, julho:7, jul:7,
        agosto:8, ago:8, setembro:9, set:9,
        outubro:10, out:10, novembro:11, nov:11,
        dezembro:12, dez:12,
    };

    const norm = s.toLowerCase().replace(/\./g, '');
    const ext = norm.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})/);
    if (ext && meses[ext[2]]) return `${ext[3]}-${String(meses[ext[2]]).padStart(2,'0')}-${ext[1].padStart(2,'0')}`;

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

    return null;
}

function repairJson(raw) {
    let s = (raw || '').trimEnd();
    s = s.replace(/,\s*$/, '');
    s = s.replace(/"[^"]*$/, '');
    s = s.replace(/:\s*$/, '');
    s = s.replace(/,\s*$/, '');
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if      (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
    }
    while (brackets > 0) { s += ']'; brackets--; }
    while (braces  > 0)  { s += '}'; braces--;  }
    return s;
}

function safeParse(text, label) {
    try { return JSON.parse(text); } catch (_) {
        try {
            const r = JSON.parse(repairJson(text));
            console.log(label + ' reparado OK');
            return r;
        } catch (e2) {
            console.error(label + ' falhou mesmo após repair:', (text || '').slice(-80));
            throw new Error('JSON_FAIL_' + label);
        }
    }
}

function makeTextSchema(pairs) {
    const props = {}, req = [];
    pairs.forEach(function(p) {
        const k = p[0];
        props['porque_'   + k] = { type: Type.STRING };
        props['melhoria_' + k] = { type: Type.STRING };
        req.push('porque_' + k, 'melhoria_' + k);
    });
    return { type: Type.OBJECT, properties: props, required: req };
}

async function withRetry(fn, label, attempts) {
    attempts = attempts || 3;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (e) {
            lastErr = e;
            console.error(label + ' tentativa ' + (i + 1) + ' falhou:', e.message);
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw lastErr;
}

// ── CHAMADA 1: notas + checklist + data_reuniao ───────────────────────────
async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Leia a transcrição. ' +
                'Para cada pilar retorne nota 1-5. Sem evidência = -1. ' +
                'media_final = média das notas diferentes de -1. ' +
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0-100. ' +
                'data_reuniao: extraia a data da reunião do cabeçalho da transcrição. ' +
                'O cabeçalho costuma ter o formato "Reunião em DD de mmm. de AAAA às HH:MM". ' +
                'Retorne APENAS a data no formato YYYY-MM-DD. Se não encontrar, retorne null.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:            { type: Type.NUMBER },
                    tempo_fala_cs_pct:      { type: Type.NUMBER },
                    tempo_fala_cliente_pct: { type: Type.NUMBER },
                    data_reuniao:           { type: Type.STRING, nullable: true },
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
                    'media_final', 'tempo_fala_cs_pct', 'tempo_fala_cliente_pct',
                    'nota_consultividade', 'nota_escuta_ativa', 'nota_jornada_cliente',
                    'nota_encantamento', 'nota_objecoes', 'nota_rapport', 'nota_autoridade',
                    'nota_postura', 'nota_gestao_tempo', 'nota_contextualizacao', 'nota_clareza',
                    'nota_objetividade', 'nota_flexibilidade', 'nota_dominio_produto',
                    'nota_dominio_negocio', 'nota_ecossistema_nibo', 'nota_universo_contabil',
                    'ck_prazo', 'ck_dever_casa', 'ck_certificado',
                    'ck_proximo_passo', 'ck_dor_vendas', 'ck_suporte',
                ],
            },
        },
    });

    const parsed = safeParse(res.text, 'getNumbers');

    ALL_PILLARS.forEach(function(p) {
        const val = parsed['nota_' + p[0]];
        if (val === -1 || val === 0 || val == null) parsed['nota_' + p[0]] = null;
    });

    const notasValidas = ALL_PILLARS
        .map(p => parsed['nota_' + p[0]])
        .filter(v => v !== null && v > 0 && v <= 5);
    parsed.media_final = notasValidas.length
        ? Math.round((notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length) * 10) / 10
        : null;

    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
    parsed.data_reuniao = parseDataReuniao(parsed.data_reuniao) || null;

    parsed.checklist_cs = {
        definiu_prazo_implementacao:  parsed.ck_prazo         || false,
        alinhou_dever_de_casa:        parsed.ck_dever_casa    || false,
        validou_certificado_digital:  parsed.ck_certificado   || false,
        agendou_proximo_passo:        parsed.ck_proximo_passo || false,
        conectou_com_dor_vendas:      parsed.ck_dor_vendas    || false,
        explicou_canal_suporte:       parsed.ck_suporte       || false,
    };

    return parsed;
}

// ── CHAMADA 2: meta-textos + nome_cliente ─────────────────────────────────
// 💡 APRENDIZADO: adicionamos nome_cliente ao responseSchema.
//    O responseSchema funciona como um "contrato" com a IA:
//    você declara quais campos quer, seus tipos, e quais são obrigatórios.
//    A IA garante que o JSON retornado vai ter exatamente esses campos.
async function getMeta(transcript, numbers) {
    const notasStr = ALL_PILLARS
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p    => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
        .join(', ');

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'Retorne os campos solicitados em JSON. ' +
                // ✨ Instrução para o novo campo:
                'nome_cliente: nome da empresa ou pessoa cliente identificada na transcrição. ' +
                'Procure por quem está sendo atendido — nome do escritório, empresa ou contato. ' +
                'Se não conseguir identificar claramente, retorne "Não identificado". ' +
                'pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas. ' +
                'sistemas_citados: ferramentas/sistemas mencionados pelo cliente. ' +
                'resumo_executivo: 1 frase. saude_cliente: 1 frase. risco_churn: 1 frase.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nome_cliente:     { type: Type.STRING },  // ✨ NOVO
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['nome_cliente', 'resumo_executivo', 'saude_cliente', 'risco_churn',
                           'sistemas_citados', 'pontos_fortes', 'pontos_atencao'],
            },
        },
    });
    return safeParse(res.text, 'getMeta');
}

// ── CHAMADA 3A: justificativas pilares 1-9 ────────────────────────────────
async function getTextsA(transcript, numbers) {
    const group = ALL_PILLARS.slice(0, 9);
    const notasStr = group
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p    => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
        .join(', ');
    const instruction =
        'Auditor de CS do Nibo. Notas dos pilares: ' + notasStr + '. ' +
        'Para pilares SEM evidência retorne "Sem evidência na transcrição." no porque e "" no melhoria. ' +
        'Para os demais: porque = 1 frase curta do que aconteceu; ' +
        'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelência atingida.").';
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: { responseMimeType: 'application/json', maxOutputTokens: 3000, systemInstruction: instruction, responseSchema: makeTextSchema(group) },
    });
    return safeParse(res.text, 'getTextsA');
}

// ── CHAMADA 3B: justificativas pilares 10-17 ─────────────────────────────
async function getTextsB(transcript, numbers) {
    const group = ALL_PILLARS.slice(9);
    const notasStr = group
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p    => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
        .join(', ');
    const instruction =
        'Auditor de CS do Nibo. Notas dos pilares: ' + notasStr + '. ' +
        'Para pilares SEM evidência retorne "Sem evidência na transcrição." no porque e "" no melhoria. ' +
        'Para os demais: porque = 1 frase curta do que aconteceu; ' +
        'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelência atingida.").';
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: { responseMimeType: 'application/json', maxOutputTokens: 3000, systemInstruction: instruction, responseSchema: makeTextSchema(group) },
    });
    return safeParse(res.text, 'getTextsB');
}

// ── CHAMADA 4: relatório ──────────────────────────────────────────────────
async function getRelatorio(numbers, meta, texts, coordinator) {
    const linhas = ALL_PILLARS.map(function(p) {
        const k = p[0], nota = numbers['nota_' + k];
        if (nota === null) return null;
        const pq = texts['porque_'   + k] || '';
        const ml = texts['melhoria_' + k] || '';
        const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
    }).filter(Boolean).join('\n');

    const coordinatorLine = coordinator ? `Coordenador responsável: **${coordinator}**\n\n` : '';
    // ✨ Nome do cliente aparece também no relatório gerado
    const clienteLine = meta.nome_cliente && meta.nome_cliente !== 'Não identificado'
        ? `Cliente: **${meta.nome_cliente}**\n\n`
        : '';

    const prompt =
        'Coordenador de CS do Nibo — feedback sobre o analista desta reunião.\n\n' +
        coordinatorLine +
        clienteLine +
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
        },
    });
    return res.text || '';
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const prompt      = req.body && req.body.prompt;
    const coordinator = req.body && req.body.coordinator;
    if (!prompt) return res.status(400).json({ error: 'Transcrição obrigatória.' });

    try {
        const detectado = detectAnalista(prompt);

        // 1. Notas + data_reuniao
        const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers');

        if (detectado) {
            numbers.analista_nome = detectado.nome;
            if (!coordinator) numbers.coordinator = detectado.coordinator;
        }
        numbers.analista_nome = numbers.analista_nome || 'Não identificado';
        numbers.coordinator   = coordinator || numbers.coordinator || null;

        // 2. Meta (inclui nome_cliente) + justificativas em paralelo
        const [meta, textsA, textsB] = await Promise.all([
            withRetry(() => getMeta(prompt, numbers),   'getMeta'),
            withRetry(() => getTextsA(prompt, numbers), 'getTextsA'),
            withRetry(() => getTextsB(prompt, numbers), 'getTextsB'),
        ]);
        const texts = Object.assign({}, textsA, textsB);

        ALL_PILLARS.forEach(function(p) {
            const k = p[0];
            if (numbers['nota_' + k] === null) {
                texts['porque_'   + k] = 'Sem evidência na transcrição.';
                texts['melhoria_' + k] = null;
            } else {
                texts['porque_'   + k] = texts['porque_'   + k] || 'Sem justificativa disponível.';
                texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelência atingida.';
            }
        });

        meta.nome_cliente     = meta.nome_cliente     || 'Não identificado'; // ✨
        meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
        meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
        meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
        meta.sistemas_citados = meta.sistemas_citados || [];
        meta.pontos_fortes    = meta.pontos_fortes    || [];
        meta.pontos_atencao   = meta.pontos_atencao   || [];

        // 3. Relatório
        const justificativa_detalhada = await withRetry(
            () => getRelatorio(numbers, meta, texts, numbers.coordinator), 'getRelatorio'
        );

        return res.status(200).json(
            Object.assign({}, numbers, meta, texts, {
                justificativa_detalhada,
                coordinator: numbers.coordinator,
                analista_nome: numbers.analista_nome,
                data_reuniao: numbers.data_reuniao || null,
            })
        );

    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
