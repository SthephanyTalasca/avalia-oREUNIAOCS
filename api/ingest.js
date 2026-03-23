// api/ingest.js — CS Auditor
// Recebe transcrições do Google Apps Script e dispara a análise automática
import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: { bodyParser: { sizeLimit: '20mb' } }
};

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;
const INGEST_SECRET = process.env.INGEST_SECRET || 'nibo_cs_2026_drive';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ALL_PILLARS = [
    ['consultividade',    'Consultividade'],
    ['escuta_ativa',      'Escuta Ativa'],
    ['jornada_cliente',   'Jornada do Cliente'],
    ['encantamento',      'Encantamento'],
    ['objecoes',          'Objecoes/Bugs'],
    ['rapport',           'Rapport'],
    ['autoridade',        'Autoridade'],
    ['postura',           'Postura'],
    ['gestao_tempo',      'Gestao de Tempo'],
    ['contextualizacao',  'Contextualizacao'],
    ['clareza',           'Clareza'],
    ['objetividade',      'Objetividade'],
    ['flexibilidade',     'Flexibilidade'],
    ['dominio_produto',   'Dominio de Produto'],
    ['dominio_negocio',   'Dominio de Negocio'],
    ['ecossistema_nibo',  'Ecossistema Nibo'],
    ['universo_contabil', 'Universo Contabil'],
];

// ─── Utilitarios ──────────────────────────────────────────────────────────────
function repairJson(raw) {
    let s = (raw || '').trimEnd();
    s = s.replace(/,\s*$/, '');
    s = s.replace(/"[^"]*$/, '');
    s = s.replace(/:\s*$/, '');
    s = s.replace(/,\s*$/, '');
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc)                  { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true;  continue; }
        if (ch === '"')           { inStr = !inStr; continue; }
        if (inStr) continue;
        if      (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
    }
    while (brackets > 0) { s += ']'; brackets--; }
    while (braces   > 0) { s += '}'; braces--;   }
    return s;
}

function safeParse(text, label) {
    try { return JSON.parse(text); } catch (_) {
        try {
            const r = JSON.parse(repairJson(text));
            console.log(label + ' reparado OK');
            return r;
        } catch (e2) {
            console.error(label + ' falhou:', (text || '').slice(-80));
            throw new Error('JSON_FAIL:' + label);
        }
    }
}

async function withRetry(fn, label, attempts) {
    attempts = attempts || 5;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (e) {
            lastErr = e;
            console.error(label + ' tentativa ' + (i + 1) + ' falhou:', e.message);
            if (i < attempts - 1) await new Promise(function(r) { setTimeout(r, 8000 * (i + 1)); });
        }
    }
    throw lastErr;
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

// ─── Chamadas Gemini ──────────────────────────────────────────────────────────
async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Leia a transcricao. ' +
                'Para cada pilar retorne nota 1-5. Sem evidencia = -1. ' +
                'media_final = media das notas diferentes de -1. ' +
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0-100. ' +
                'Para o checklist: ck_prazo=true se definiu prazo de implementacao, ' +
                'ck_dever_casa=true se alinhou dever de casa com o cliente, ' +
                'ck_certificado=true se validou certificado digital ou acesso ao sistema, ' +
                'ck_proximo_passo=true se agendou proxima reuniao ou proximo passo, ' +
                'ck_dor_vendas=true se conectou com a dor identificada em vendas, ' +
                'ck_suporte=true se explicou o canal de suporte ao cliente.',
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
                    'ck_prazo','ck_dever_casa','ck_certificado','ck_proximo_passo','ck_dor_vendas','ck_suporte',
                ],
            },
        },
    });

    const parsed = safeParse(res.text, 'getNumbers');
    ALL_PILLARS.forEach(function(p) {
        if (parsed['nota_' + p[0]] === -1) parsed['nota_' + p[0]] = null;
    });
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
        .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
        .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
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
                'pontos_fortes e pontos_atencao: max 4 itens cada, frases curtas. ' +
                'sistemas_citados: ferramentas/sistemas mencionados pelo cliente. ' +
                'resumo_executivo: 1 frase. saude_cliente: 1 frase. risco_churn: 1 frase.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['resumo_executivo','saude_cliente','risco_churn',
                           'sistemas_citados','pontos_fortes','pontos_atencao'],
            },
        },
    });
    return safeParse(res.text, 'getMeta');
}

async function getTextsA(transcript, numbers) {
    const group = ALL_PILLARS.slice(0, 9);
    const notasStr = group
        .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
        .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
        .join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas dos pilares: ' + notasStr + '. ' +
                'Para pilares SEM evidencia retorne "Sem evidencia na transcricao." no porque e "" no melhoria. ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelencia atingida.").',
            responseSchema: makeTextSchema(group),
        },
    });
    return safeParse(res.text, 'getTextsA');
}

async function getTextsB(transcript, numbers) {
    const group = ALL_PILLARS.slice(9);
    const notasStr = group
        .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
        .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
        .join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas dos pilares: ' + notasStr + '. ' +
                'Para pilares SEM evidencia retorne "Sem evidencia na transcricao." no porque e "" no melhoria. ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelencia atingida.").',
            responseSchema: makeTextSchema(group),
        },
    });
    return safeParse(res.text, 'getTextsB');
}

async function getRelatorio(numbers, meta, texts, analistaNome) {
    const linhas = ALL_PILLARS.map(function(p) {
        const k    = p[0];
        const nota = numbers['nota_' + k];
        if (nota === null) return null;
        const pq  = texts['porque_'   + k] || '';
        const ml  = texts['melhoria_' + k] || '';
        const suf = (ml && ml !== 'Excelencia atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
    }).filter(Boolean).join('\n');

    const prompt =
        'Coordenador de CS do Nibo — feedback sobre a analista **' + analistaNome + '**.\n\n' +
        'NOTAS:\n' + linhas + '\n\n' +
        'Media: ' + (numbers.media_final || '?') + '/5' +
        ' | Saude: ' + (meta.saude_cliente || '') +
        ' | Churn: '  + (meta.risco_churn  || '') + '\n' +
        'Fortes: '  + (meta.pontos_fortes  || []).join('; ') + '\n' +
        'Atencao: ' + (meta.pontos_atencao || []).join('; ') + '\n\n' +
        '## O que o analista fez bem\n' +
        '## O que precisa melhorar\n' +
        '## O que falar no 1:1\n' +
        '## Plano de acao individual';

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 4096,
            systemInstruction:
                'Coordenador senior de CS do Nibo. Markdown puro, linguagem direta e humana. ' +
                '"O que falar no 1:1": frases prontas para usar literalmente. ' +
                '"Plano de acao": max 3 prioridades com acao + prazo + metrica. ' +
                'So mencione pilares com nota numerica.',
        },
    });
    return res.text || '';
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
async function jaExisteNoBanco(driveFileId) {
    if (!driveFileId) return false;
    const r = await fetch(
        SUPABASE_URL + '/rest/v1/cs_reunioes?drive_file_id=eq.' + driveFileId + '&select=id',
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
}

// ─── Busca coordenador da analista no banco ───────────────────────────────────
async function buscarCoordenador(analistaNome) {
    if (!analistaNome) return null;
    try {
        const r = await fetch(
            SUPABASE_URL + '/rest/v1/cs_analistas?nome=ilike.' +
            encodeURIComponent(analistaNome) + '&select=coordenador&limit=1',
            { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
        );
        const rows = await r.json();
        return (Array.isArray(rows) && rows[0]?.coordenador) || null;
    } catch (e) {
        console.error('Erro ao buscar coordenador:', e.message);
        return null;
    }
}

// ─── Salva no Supabase ────────────────────────────────────────────────────────
async function salvarNoSupabase(analise, analistaNome, driveFileId, dataReuniao, coordenador) {
    const row = {
        analista_nome:          analistaNome,
        coordenador:            coordenador          || null,
        drive_file_id:          driveFileId          || null,
        data_reuniao:           dataReuniao          || null,
        file_url:               analise.file_url     || null,
        media_final:            analise.media_final          || null,
        saude_cliente:          analise.saude_cliente        || null,
        risco_churn:            analise.risco_churn          || null,
        tempo_fala_cs:          analise.tempo_fala_cs        || null,
        tempo_fala_cliente:     analise.tempo_fala_cliente   || null,
        nota_consultividade:    analise.nota_consultividade  || null,
        nota_escuta_ativa:      analise.nota_escuta_ativa    || null,
        nota_jornada_cliente:   analise.nota_jornada_cliente || null,
        nota_encantamento:      analise.nota_encantamento    || null,
        nota_objecoes:          analise.nota_objecoes        || null,
        nota_rapport:           analise.nota_rapport         || null,
        nota_autoridade:        analise.nota_autoridade      || null,
        nota_postura:           analise.nota_postura         || null,
        nota_gestao_tempo:      analise.nota_gestao_tempo    || null,
        nota_contextualizacao:  analise.nota_contextualizacao || null,
        nota_clareza:           analise.nota_clareza          || null,
        nota_objetividade:      analise.nota_objetividade     || null,
        nota_flexibilidade:     analise.nota_flexibilidade    || null,
        nota_dominio_produto:   analise.nota_dominio_produto  || null,
        nota_dominio_negocio:   analise.nota_dominio_negocio  || null,
        nota_ecossistema_nibo:  analise.nota_ecossistema_nibo || null,
        nota_universo_contabil: analise.nota_universo_contabil || null,
        analise_json:           analise,
    };

    const r = await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
    });

    if (!r.ok) throw new Error('Supabase: ' + await r.text());
    const saved = await r.json();
    return saved[0] && saved[0].id;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const secret = req.headers['x-ingest-secret'] || (req.body && req.body.secret);
    if (secret !== INGEST_SECRET) {
        return res.status(401).json({ error: 'Nao autorizado.' });
    }

    const body          = req.body || {};
    const transcript    = body.transcript;
    const folder_name   = body.folder_name;
    const file_name     = body.file_name;
    const data_reuniao  = body.data_reuniao;
    const drive_file_id = body.drive_file_id;
    const file_url      = body.file_url;

    if (!transcript || transcript.trim().length < 50) {
        return res.status(400).json({ error: 'Transcricao ausente ou muito curta.' });
    }

    // Evita reprocessar o mesmo arquivo
    try {
        if (drive_file_id && await jaExisteNoBanco(drive_file_id)) {
            console.log('Arquivo ja processado: ' + drive_file_id);
            return res.status(200).json({ skipped: true, drive_file_id: drive_file_id });
        }
    } catch (e) {
        console.error('Erro ao checar duplicata:', e.message);
    }

    const analistaNome = (folder_name || 'Nao identificado').trim();
    console.log('Processando: ' + file_name + ' | Analista: ' + analistaNome);

    try {
        // 1. Notas numericas
        const numbers = await withRetry(function() { return getNumbers(transcript); }, 'getNumbers');

        // 2. Meta + justificativas + coordenador em paralelo ✅
        const results = await Promise.all([
            withRetry(function() { return getMeta(transcript, numbers);   }, 'getMeta'),
            withRetry(function() { return getTextsA(transcript, numbers); }, 'getTextsA'),
            withRetry(function() { return getTextsB(transcript, numbers); }, 'getTextsB'),
            buscarCoordenador(analistaNome), // ✅ dentro do handler async, funciona!
        ]);
        const meta        = results[0];
        const texts       = Object.assign({}, results[1], results[2]);
        const coordenador = results[3];

        // Fallbacks
        ALL_PILLARS.forEach(function(p) {
            const k = p[0];
            if (numbers['nota_' + k] === null) {
                texts['porque_'   + k] = 'Sem evidencia na transcricao.';
                texts['melhoria_' + k] = null;
            } else {
                texts['porque_'   + k] = texts['porque_'   + k] || 'Sem justificativa disponivel.';
                texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelencia atingida.';
            }
        });
        meta.resumo_executivo = meta.resumo_executivo || 'Reuniao de onboarding realizada.';
        meta.saude_cliente    = meta.saude_cliente    || 'Nao avaliado.';
        meta.risco_churn      = meta.risco_churn      || 'Nao avaliado.';
        meta.sistemas_citados = meta.sistemas_citados || [];
        meta.pontos_fortes    = meta.pontos_fortes    || [];
        meta.pontos_atencao   = meta.pontos_atencao   || [];

        // 3. Relatorio
        const justificativa_detalhada = await withRetry(
            function() { return getRelatorio(numbers, meta, texts, analistaNome); }, 'getRelatorio'
        );

        const analise = Object.assign({}, numbers, meta, texts, {
            analista_nome:           analistaNome,
            justificativa_detalhada: justificativa_detalhada,
            file_url:                file_url || null,
        });

        // 4. Salva no Supabase
        const id = await salvarNoSupabase(analise, analistaNome, drive_file_id, data_reuniao, coordenador);

        console.log('Salvo! ID: ' + id + ' | Analista: ' + analistaNome + ' | Media: ' + numbers.media_final + ' | Coordenador: ' + coordenador);
        return res.status(200).json({
            ok: true,
            id: id,
            analista: analistaNome,
            media_final: numbers.media_final,
            coordenador: coordenador,
        });

    } catch (err) {
        console.error('Erro no ingest:', err);
        return res.status(500).json({ error: err.message });
    }
}
