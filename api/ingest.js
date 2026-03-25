// api/ingest.js — CS Auditor
// POST /api/ingest  → recebe transcrição do Apps Script e salva como pendente (rápido)
// GET  /api/ingest  → processa 1 transcrição pendente com Gemini (chamado pelo cron)
import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: { bodyParser: { sizeLimit: '20mb' } }
};

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;
const INGEST_SECRET  = process.env.INGEST_SECRET || 'nibo_cs_2026_drive';

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

// ─── Utils ────────────────────────────────────────────────────────────────────
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

// ── CORRIGIDO: captura data E hora, trata GMT-03:00, formato Supabase ─────
function parseDataReuniao(rawDate) {
    if (!rawDate) return null;
    // Remove timezone suffix tipo " GMT-03:00" ou "Z" — usa horário local da reunião
    const s = String(rawDate).trim().replace(/\s*GMT[+-]\d{2}:\d{2}$/i, '').replace(/Z$/, '').trim();

    // Já está em formato ISO: 2025-03-10T14:30:00 ou 2025-03-10 14:30:00
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
        return s.slice(0, 19).replace('T', ' ');
    }

    // Só data ISO: 2025-03-10
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + ' 00:00:00';

    // DD/MM/YYYY HH:MM
    const dmyHm = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
    if (dmyHm) {
        return `${dmyHm[3]}-${dmyHm[2].padStart(2,'0')}-${dmyHm[1].padStart(2,'0')} ${dmyHm[4].padStart(2,'0')}:${dmyHm[5]}:00`;
    }

    // DD/MM/YYYY sem hora
    const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')} 00:00:00`;

    const meses = {
        janeiro:1, jan:1, fevereiro:2, fev:2,
        março:3, mar:3, marco:3, abril:4, abr:4,
        maio:5, junho:6, jun:6, julho:7, jul:7,
        agosto:8, ago:8, setembro:9, set:9,
        outubro:10, out:10, novembro:11, nov:11,
        dezembro:12, dez:12,
    };

    const norm = s.toLowerCase().replace(/\./g, '');

    // "25 de mar de 2026 às 14:24" — GMT já removido acima
    const extHm = norm.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})\s+(?:às|as|a)\s+(\d{1,2}):(\d{2})/);
    if (extHm && meses[extHm[2]]) {
        return `${extHm[3]}-${String(meses[extHm[2]]).padStart(2,'0')}-${extHm[1].padStart(2,'0')} ${extHm[4].padStart(2,'0')}:${extHm[5]}:00`;
    }

    // "25 de mar de 2026" sem hora
    const ext = norm.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})/);
    if (ext && meses[ext[2]]) {
        return `${ext[3]}-${String(meses[ext[2]]).padStart(2,'0')}-${ext[1].padStart(2,'0')} 00:00:00`;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');

    return null;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
// CORRIGIDO: instrução reforçada para extrair data+hora e nunca usar data de hoje
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
                'data_reuniao: extraia a data E hora exata da reuniao do cabecalho da transcricao. ' +
                'O cabecalho do Gemini Notes tem o formato: "Reuniao em DD de mmm. de AAAA as HH:MM GMT-03:00". ' +
                'Exemplo: "Reuniao em 25 de mar. de 2026 as 14:24 GMT-03:00" → retorne "2026-03-25 14:24:00". ' +
                'Exemplo: "Reuniao em 5 de jan. de 2025 as 09:15 GMT-03:00" → retorne "2025-01-05 09:15:00". ' +
                'OBRIGATORIO: retorne no formato "YYYY-MM-DD HH:MM:00" (sem T, sem GMT, sem timezone). ' +
                'NUNCA retorne a data de hoje. Se nao encontrar data no cabecalho, retorne null. ' +
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
        if (parsed['nota_' + p[0]] === -1 || parsed['nota_' + p[0]] === 0) parsed['nota_' + p[0]] = null;
    });
    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
    // CORRIGIDO: usa o novo parseDataReuniao que preserva a hora
    parsed.data_reuniao = parseDataReuniao(parsed.data_reuniao) || null;
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

// CORRIGIDO: instrução muito mais forte para identificar o cliente
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
                'nome_cliente: OBRIGATORIO — identifique o nome da empresa, escritorio contabil ou cliente sendo atendido na reuniao. ' +
                'Procure em toda a transcricao por: (1) nome do escritorio ou empresa do cliente, ' +
                '(2) nome de quem esta sendo atendido pelo CS, ' +
                '(3) qualquer mencao a "escritorio", "empresa", "cliente", "razao social", "CNPJ", ' +
                '(4) como o CS se dirige a pessoa — "Fulano da Empresa X". ' +
                'Leia o inicio E o final da transcricao com atencao especial. ' +
                'Prefira o nome da empresa/escritorio ao nome pessoal. ' +
                'So retorne "Nao identificado" se absolutamente nao houver NENHUMA pista na transcricao. ' +
                'pontos_fortes e pontos_atencao: max 4 itens cada, frases curtas. ' +
                'sistemas_citados: ferramentas/sistemas mencionados pelo cliente. ' +
                'resumo_executivo: 1 frase. saude_cliente: 1 frase. risco_churn: 1 frase.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nome_cliente:     { type: Type.STRING },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['nome_cliente', 'resumo_executivo','saude_cliente','risco_churn',
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

    const clienteLine = meta.nome_cliente && meta.nome_cliente !== 'Nao identificado'
        ? `Cliente: **${meta.nome_cliente}**\n\n`
        : '';

    const prompt =
        'Coordenador de CS do Nibo — feedback sobre a analista **' + analistaNome + '**.\n\n' +
        clienteLine +
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

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function jaExisteNoBanco(driveFileId) {
    if (!driveFileId) return false;
    const r = await fetch(
        SUPABASE_URL + '/rest/v1/cs_reunioes?drive_file_id=eq.' + driveFileId + '&select=id,status',
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
}

async function buscarPendente() {
    const r = await fetch(
        SUPABASE_URL + '/rest/v1/cs_reunioes?status=eq.pendente&order=created_at.asc&limit=1&select=*',
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await r.json();
    return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}

async function marcarProcessando(id) {
    await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes?id=eq.' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ status: 'processando' }),
    });
}

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
    } catch (e) { return null; }
}

async function salvarResultado(id, analise, coordenador) {
    const update = {
        status:                  'concluido',
        coordenador:             coordenador                      || null,
        // CORRIGIDO: salva nome_cliente e data_reuniao com hora
        nome_cliente:            analise.nome_cliente             || 'Não identificado',
        data_reuniao:            analise.data_reuniao             || null,
        media_final:             analise.media_final              || null,
        saude_cliente:           analise.saude_cliente            || null,
        risco_churn:             analise.risco_churn              || null,
        tempo_fala_cs:           analise.tempo_fala_cs            || null,
        tempo_fala_cliente:      analise.tempo_fala_cliente       || null,
        nota_consultividade:     analise.nota_consultividade      || null,
        nota_escuta_ativa:       analise.nota_escuta_ativa        || null,
        nota_jornada_cliente:    analise.nota_jornada_cliente     || null,
        nota_encantamento:       analise.nota_encantamento        || null,
        nota_objecoes:           analise.nota_objecoes            || null,
        nota_rapport:            analise.nota_rapport             || null,
        nota_autoridade:         analise.nota_autoridade          || null,
        nota_postura:            analise.nota_postura             || null,
        nota_gestao_tempo:       analise.nota_gestao_tempo        || null,
        nota_contextualizacao:   analise.nota_contextualizacao    || null,
        nota_clareza:            analise.nota_clareza             || null,
        nota_objetividade:       analise.nota_objetividade        || null,
        nota_flexibilidade:      analise.nota_flexibilidade       || null,
        nota_dominio_produto:    analise.nota_dominio_produto     || null,
        nota_dominio_negocio:    analise.nota_dominio_negocio     || null,
        nota_ecossistema_nibo:   analise.nota_ecossistema_nibo    || null,
        nota_universo_contabil:  analise.nota_universo_contabil   || null,
        ck_prazo:                analise.ck_prazo                 || false,
        ck_dever_casa:           analise.ck_dever_casa            || false,
        ck_certificado:          analise.ck_certificado           || false,
        ck_proximo_passo:        analise.ck_proximo_passo         || false,
        ck_dor_vendas:           analise.ck_dor_vendas            || false,
        ck_suporte:              analise.ck_suporte               || false,
        resumo_executivo:        analise.resumo_executivo         || null,
        sistemas_citados:        analise.sistemas_citados         || [],
        pontos_fortes:           analise.pontos_fortes            || [],
        pontos_atencao:          analise.pontos_atencao           || [],
        justificativa_detalhada: analise.justificativa_detalhada  || null,
        analise_json:            analise,
    };
    const r = await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes?id=eq.' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify(update),
    });
    if (!r.ok) throw new Error('Supabase PATCH: ' + await r.text());
}

async function marcarErro(id, msg) {
    await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes?id=eq.' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ status: 'erro', error_msg: msg }),
    });
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {

    // ── GET → cron processa 1 pendente ────────────────────────────────────────
    if (req.method === 'GET') {
        const secret = req.query?.secret;
        if (secret !== INGEST_SECRET) {
            return res.status(401).json({ error: 'Nao autorizado.' });
        }

        const row = await buscarPendente();
        if (!row) {
            return res.status(200).json({ ok: true, message: 'Nenhuma transcricao pendente.' });
        }

        const id           = row.id;
        const analistaNome = row.analista_nome || 'Nao identificado';
        const transcript   = row.analise_json?.transcript;

        if (!transcript || transcript.trim().length < 50) {
            await marcarErro(id, 'Transcricao ausente ou muito curta no banco.');
            return res.status(200).json({ ok: false, id: id, error: 'Transcricao invalida.' });
        }

        await marcarProcessando(id);
        console.log('Processando ID ' + id + ' | Analista: ' + analistaNome);

        try {
            const numbers = await withRetry(function() { return getNumbers(transcript); }, 'getNumbers');

            const results = await Promise.all([
                withRetry(function() { return getMeta(transcript, numbers);   }, 'getMeta'),
                withRetry(function() { return getTextsA(transcript, numbers); }, 'getTextsA'),
                withRetry(function() { return getTextsB(transcript, numbers); }, 'getTextsB'),
                buscarCoordenador(analistaNome),
            ]);
            const meta        = results[0];
            const texts       = Object.assign({}, results[1], results[2]);
            const coordenador = results[3];

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
            meta.nome_cliente     = meta.nome_cliente     || 'Não identificado';
            meta.resumo_executivo = meta.resumo_executivo || 'Reuniao de onboarding realizada.';
            meta.saude_cliente    = meta.saude_cliente    || 'Nao avaliado.';
            meta.risco_churn      = meta.risco_churn      || 'Nao avaliado.';
            meta.sistemas_citados = meta.sistemas_citados || [];
            meta.pontos_fortes    = meta.pontos_fortes    || [];
            meta.pontos_atencao   = meta.pontos_atencao   || [];

            const justificativa_detalhada = await withRetry(
                function() { return getRelatorio(numbers, meta, texts, analistaNome); }, 'getRelatorio'
            );

            const analise = Object.assign({}, numbers, meta, texts, {
                analista_nome:           analistaNome,
                justificativa_detalhada: justificativa_detalhada,
            });

            await salvarResultado(id, analise, coordenador);

            console.log('Concluido ID ' + id + ' | Media: ' + numbers.media_final);
            return res.status(200).json({ ok: true, id: id, analista: analistaNome, media_final: numbers.media_final });

        } catch (err) {
            console.error('Erro ao processar ID ' + id + ':', err.message);
            await marcarErro(id, err.message);
            return res.status(500).json({ error: err.message, id: id });
        }
    }

    // ── POST → Apps Script envia transcrição, salva como pendente ─────────────
    if (req.method === 'POST') {
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

        // Checa duplicata
        try {
            if (drive_file_id && await jaExisteNoBanco(drive_file_id)) {
                return res.status(200).json({ skipped: true, drive_file_id: drive_file_id });
            }
        } catch (e) {
            console.error('Erro ao checar duplicata:', e.message);
        }

        const analistaNome = (folder_name || 'Nao identificado').trim();

        const row = {
            analista_nome: analistaNome,
            drive_file_id: drive_file_id || null,
            file_url:      file_url      || null,
            // data_reuniao vinda do Apps Script (data de criação do arquivo)
            // será sobrescrita pelo Gemini ao processar com a data real da transcrição
            data_reuniao:  data_reuniao  || null,
            status:        'pendente',
            analise_json:  { transcript: transcript, file_name: file_name || null },
        };

        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey:         SUPABASE_KEY,
                    Authorization:  'Bearer ' + SUPABASE_KEY,
                    Prefer:         'return=representation',
                },
                body: JSON.stringify(row),
            });

            if (!r.ok) throw new Error('Supabase: ' + await r.text());
            const saved = await r.json();
            const id    = saved[0] && saved[0].id;

            console.log('Enfileirado ID ' + id + ' | Analista: ' + analistaNome);
            return res.status(200).json({ ok: true, id: id, status: 'pendente', analista: analistaNome });

        } catch (err) {
            console.error('Erro ao salvar pendente:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Metodo nao permitido.' });
}
