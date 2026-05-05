import { GoogleGenAI, Type } from '@google/genai';
import { getConfig } from './config.js';

export const maxDuration = 300;
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CS_PILLARS = [
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

// ── Detecção de analista via Supabase (dinâmica) ──────────────────────────
async function detectAnalista(transcript) {
    if (!transcript) return null;
    try {
        const { CS_TO_COORDINATOR, CS_NOME_LOOKUP } = await getConfig();
        const lower = transcript.toLowerCase();
        const sorted = Object.keys(CS_TO_COORDINATOR).sort((a, b) => b.length - a.length);
        for (const key of sorted) {
            if (lower.includes(key)) {
                return {
                    nome: CS_NOME_LOOKUP[key] || key,
                    coordinator: CS_TO_COORDINATOR[key],
                };
            }
        }
    } catch (e) {
        console.error('detectAnalista falhou:', e.message);
    }
    return null;
}

// ── CORRIGIDO: captura data E hora, trata GMT-03:00, formato Supabase ─────
function parseDataReuniao(rawDate) {
    if (!rawDate) return null;
    const s = String(rawDate).trim().replace(/\s*GMT[+-]\d{2}:\d{2}$/i, '').replace(/Z$/, '').trim();

    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
        return s.slice(0, 19).replace('T', ' ');
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + ' 00:00:00';

    const dmyHm = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
    if (dmyHm) {
        return `${dmyHm[3]}-${dmyHm[2].padStart(2,'0')}-${dmyHm[1].padStart(2,'0')} ${dmyHm[4].padStart(2,'0')}:${dmyHm[5]}:00`;
    }

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

    const extHm = norm.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})\s+(?:às|as|a)\s+(\d{1,2}):(\d{2})/);
    if (extHm && meses[extHm[2]]) {
        return `${extHm[3]}-${String(meses[extHm[2]]).padStart(2,'0')}-${extHm[1].padStart(2,'0')} ${extHm[4].padStart(2,'0')}:${extHm[5]}:00`;
    }

    const ext = norm.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})/);
    if (ext && meses[ext[2]]) {
        return `${ext[3]}-${String(meses[ext[2]]).padStart(2,'0')}-${ext[1].padStart(2,'0')} 00:00:00`;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');

    return null;
}

function repairJson(raw) {
    let s = (raw || '').trimEnd();
    s = s.replace(/,\s*$/, '');
    // Remove unterminated string value (handles escape sequences correctly)
    s = s.replace(/"(?:[^"\\]|\\.)*$/, '');
    // Remove dangling key with no value: "key": or "key"
    s = s.replace(/,?\s*"[^"]+"\s*(?::\s*)?$/, '');
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

function safeText(res, label) {
    const t = res.text;
    if (typeof t === 'string' && t.length > 0) return t;
    const fallback = res.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof fallback === 'string' && fallback.length > 0) return fallback;
    throw new Error('EMPTY_RESPONSE_' + label);
}

function safeParse(text, label) {
    try { return JSON.parse(text); } catch (_) {
        try {
            const r = JSON.parse(repairJson(text));
            console.log(label + ' reparado OK');
            return r;
        } catch (e2) {
            const snippet = (text || '').slice(-120);
            console.error(label + ' falhou mesmo após repair. Trecho final:', snippet);
            throw new Error('JSON_FAIL_' + label + ': ' + snippet);
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



function joinPromptBlocks(arr) {
    return arr.filter(Boolean).map(function(t) { return String(t).trim(); }).filter(Boolean).join(' ');
}

async function getNumbers(transcript) {
    const { PROMPTS, PILLARS_PROMPT } = await getConfig();

    const instrucaoAvaliacao = joinPromptBlocks([
        'Auditor de CS do Nibo. Leia a transcrição.',
        PROMPTS?.instrucao_contexto_cs,
        PROMPTS?.instrucao_avaliacao,
        PROMPTS?.instrucao_avaliacao_justa,
        PROMPTS?.instrucao_escala_notas,
        PROMPTS?.instrucao_media_final,
        PILLARS_PROMPT ? 'PILARES E RUBRICAS ATIVAS: ' + PILLARS_PROMPT : '',
        'Para cada pilar retorne nota 1-5. Sem evidência = -1.',
    ]);

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                instrucaoAvaliacao + ' ' +
                'media_final = média das notas diferentes de -1. ' +
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0-100. ' +
                'REGRA GERAL — bugs e erros de plataforma: ' +
                'A existência de bugs, erros ou falhas do sistema/plataforma é um problema do PRODUTO, não do CS. ' +
                'NUNCA penalize nenhum pilar porque um bug ou erro de plataforma ocorreu. ' +
                'Em todos os pilares, avalie exclusivamente a CONDUTA do CS, independentemente de problemas técnicos. ' +
                'REGRA ESPECIAL — nota_objecoes (Objeções/Bugs): ' +
                'Bugs, erros e falhas de plataforma NUNCA devem resultar em nota baixa por si só. ' +
                'Avalie APENAS como o CS conduziu a situação: ' +
                'Nota 5: CS identificou o problema proativamente, ajudou a diagnosticar, escalou corretamente e manteve o cliente tranquilo — tentativas de ajudar a consertar o erro do sistema devem ser avaliadas com nota 5. ' +
                'Nota 4: CS tratou bem o problema mas sem protagonismo total. ' +
                'Nota 3: CS reconheceu o problema mas de forma passiva. ' +
                'Nota 2: CS minimizou ou ignorou parcialmente a situação. ' +
                'Nota 1: CS ignorou o problema ou piorou a situação. ' +
                'Se não houve objeções nem bugs na reunião, retorne -1 (sem evidência). ' +
                'REGRA ESPECIAL — nota_gestao_tempo: ' +
                'Se a reunião foi encerrada antes do tempo OU se passou do horário previsto POR CAUSA de bug, erro ou falha de plataforma (ex: sistema caiu, erro técnico, plataforma travou), retorne -1 — isso está fora do controle do CS e NÃO deve ser penalizado. ' +
                'Só penalize gestão de tempo (nota 1-4) se o problema de tempo foi causado pela CONDUTA do próprio CS (ex: se perdeu em detalhes desnecessários, não cobriu a pauta, deixou a reunião se estender por dispersão própria). ' +
                'Se o cliente encerrou a reunião por escolha própria sem motivo técnico, avalie normalmente. ' +
                'data_reuniao: extraia a data E hora exata da reunião do cabeçalho da transcrição. ' +
                'O cabeçalho do Gemini Notes tem o formato: "Reunião em DD de mmm. de AAAA às HH:MM GMT-03:00". ' +
                'Exemplo: "Reunião em 25 de mar. de 2026 às 14:24 GMT-03:00" → retorne "2026-03-25 14:24:00". ' +
                'Exemplo: "Reunião em 5 de jan. de 2025 às 09:15 GMT-03:00" → retorne "2025-01-05 09:15:00". ' +
                'OBRIGATÓRIO: retorne no formato "YYYY-MM-DD HH:MM:00" (sem T, sem GMT, sem timezone). ' +
                'NUNCA retorne a data de hoje. Se não encontrar data no cabeçalho, retorne null. ' +
                'CHECKLIST — retorne true APENAS se houver evidência CLARA e EXPLÍCITA na transcrição. Na dúvida, retorne false. ' +
                'ck_prazo: true somente se o analista mencionou um prazo, data ou cronograma de implementação junto ao cliente. ' +
                'ck_dever_casa: true somente se o analista alinhou tarefas que o cliente precisa fazer antes da próxima reunião (dever de casa). ' +
                'ck_certificado: true somente se o analista abordou ou validou o certificado digital com o cliente. ' +
                'ck_proximo_passo: true somente se o analista agendou ou combinou explicitamente o próximo passo ou próxima reunião. ' +
                'ck_dor_vendas: true somente se o analista conectou a conversa com oportunidade de venda, expansão ou dor do cliente ligada a vendas. ' +
                'ck_suporte: true somente se o analista explicou ou mencionou o canal de suporte ao cliente.',
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

    const parsed = safeParse(safeText(res, 'getNumbers'), 'getNumbers');

    CS_PILLARS.forEach(function(p) {
        const val = parsed['nota_' + p[0]];
        if (val === -1 || val === 0 || val == null) parsed['nota_' + p[0]] = null;
    });

    const notasValidas = CS_PILLARS
        .map(p => parsed['nota_' + p[0]])
        .filter(v => v !== null && v > 0 && v <= 5);

    parsed.media_final = notasValidas.length
        ? Math.round((notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length) * 10) / 10
        : null;

    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
    parsed.data_reuniao = parseDataReuniao(parsed.data_reuniao) || null;

    parsed.checklist_cs = {
        definiu_prazo_implementacao:  parsed.ck_prazo         === true,
        alinhou_dever_de_casa:        parsed.ck_dever_casa    === true,
        validou_certificado_digital:  parsed.ck_certificado   === true,
        agendou_proximo_passo:        parsed.ck_proximo_passo === true,
        conectou_com_dor_vendas:      parsed.ck_dor_vendas    === true,
        explicou_canal_suporte:       parsed.ck_suporte       === true,
    };

    return parsed;
}

async function getMeta(transcript, numbers) {
    const notasStr = CS_PILLARS
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
                'nome_cliente: OBRIGATÓRIO — identifique o nome da empresa, escritório contábil ou cliente sendo atendido na reunião. ' +
                'Procure em toda a transcrição por: (1) nome do escritório ou empresa do cliente, ' +
                '(2) nome de quem está sendo atendido pelo CS, ' +
                '(3) qualquer menção a "escritório", "empresa", "cliente", "razão social", "CNPJ", ' +
                '(4) como o CS se dirige à pessoa — "Fulano da Empresa X". ' +
                'Leia o início E o final da transcrição com atenção especial. ' +
                'Prefira o nome da empresa/escritório ao nome pessoal. ' +
                'Só retorne "Não identificado" se absolutamente não houver NENHUMA pista na transcrição. ' +
                'pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas. ' +
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
                required: ['nome_cliente', 'resumo_executivo', 'saude_cliente', 'risco_churn',
                           'sistemas_citados', 'pontos_fortes', 'pontos_atencao'],
            },
        },
    });
    return safeParse(safeText(res, 'getMeta'), 'getMeta');
}

function makeTextInstruction(notasStr) {
    return 'Auditor de CS do Nibo. Notas dos pilares (nota 1 a 5): ' + notasStr + '. ' +
        'REGRA 1 — Pilares COM nota (listados acima): ' +
        'porque: OBRIGATÓRIO e NÃO pode ficar vazio — se houver trecho literal relevante, cite entre aspas (Trecho: "..." | Leitura: ...); ' +
        'se não houver trecho específico, descreva objetivamente o comportamento do CS neste pilar com base no que foi observado na transcrição. ' +
        'melhoria: se nota=5 escreva "Excelência atingida."; para nota 1, 2, 3 ou 4 escreva 1 frase objetiva do que faltou para atingir nota 5 — NUNCA deixe vazio. ' +
        'REGRA 2 — Pilares SEM nota (não aparecem na lista acima): porque = "Sem evidência na transcrição."; melhoria = "". ' +
        'NUNCA invente citação que não exista na transcrição. Quando não houver trecho específico, use observação direta sobre o comportamento.';
}

async function getTextsA(transcript, numbers) {
    const group = CS_PILLARS.slice(0, 9);
    const notasStr = group
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p    => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
        .join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: { responseMimeType: 'application/json', maxOutputTokens: 6000, systemInstruction: makeTextInstruction(notasStr), responseSchema: makeTextSchema(group) },
    });
    return safeParse(safeText(res, 'getTextsA'), 'getTextsA');
}

async function getTextsB(transcript, numbers) {
    const group = CS_PILLARS.slice(9);
    const notasStr = group
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p    => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
        .join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: { responseMimeType: 'application/json', maxOutputTokens: 6000, systemInstruction: makeTextInstruction(notasStr), responseSchema: makeTextSchema(group) },
    });
    return safeParse(safeText(res, 'getTextsB'), 'getTextsB');
}

async function getDesalinhamentos(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Detecte desalinhamentos de venda na transcrição: ' +
                'momentos em que o cliente expressa que algo prometido na venda não corresponde ao que recebeu. ' +
                'Frases típicas que indicam desalinhamento: ' +
                '"o vendedor me disse", "me falaram que", "achei que ia ter", "me prometeram", ' +
                '"estava incluso", "constava na proposta", "não era isso que eu entendi", ' +
                '"me venderam diferente", "esperava que", "no momento da venda", ' +
                '"me enganaram", "foi prometido", "entrei pensando que". ' +
                'Para cada desalinhamento encontrado preencha: ' +
                'expectativa = o que o cliente esperava ter/receber; ' +
                'realidade = o que existe de fato (se mencionado na transcrição, senão vazio); ' +
                'frase_cliente = trecho exato ou próximo do que o cliente disse; ' +
                'severidade: "alta" = funcionalidade core inexistente ou plano/preço errado, ' +
                '"media" = funcionalidade existe mas diferente do esperado, ' +
                '"baixa" = mal-entendido de processo ou prazo; ' +
                'como_tratado: "explicou" = analista esclareceu a situação, ' +
                '"escalou" = analista prometeu acionar outro time, ' +
                '"registrou" = analista anotou como feedback, ' +
                '"ignorou" = não abordou o ponto, ' +
                '"nao_identificado" = não ficou claro como tratou. ' +
                'Se não houver nenhum desalinhamento retorne tem_desalinhamento false e array vazio.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    tem_desalinhamento: { type: Type.BOOLEAN },
                    desalinhamentos: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                expectativa:   { type: Type.STRING },
                                realidade:     { type: Type.STRING },
                                frase_cliente: { type: Type.STRING },
                                severidade:    { type: Type.STRING },
                                como_tratado:  { type: Type.STRING },
                            },
                            required: ['expectativa', 'frase_cliente', 'severidade', 'como_tratado'],
                        },
                    },
                },
                required: ['tem_desalinhamento', 'desalinhamentos'],
            },
        },
    });
    const parsed = safeParse(safeText(res, 'getDesalinhamentos'), 'getDesalinhamentos');
    parsed.desalinhamentos = parsed.desalinhamentos || [];
    parsed.tem_desalinhamento = parsed.desalinhamentos.length > 0;
    return parsed;
}

async function getBugs(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Identifique na transcrição situações de bugs, erros ou falhas do sistema: ' +
                '(1) erros ou comportamentos inesperados no sistema/produto Nibo relatados pelo cliente ou detectados durante a reunião; ' +
                '(2) funcionalidades que não funcionaram como esperado ou como foram prometidas; ' +
                '(3) momentos em que foi necessário acionar o suporte técnico ou abrir chamado; ' +
                '(4) integrações que falharam ou não configuraram corretamente; ' +
                '(5) dados incorretos, importações com erro ou processos que travaram. ' +
                'Para cada ocorrência preencha: ' +
                'descricao = descrição objetiva do problema; ' +
                'contexto = o que estava sendo feito quando o problema ocorreu; ' +
                'impacto: "alto" = bloqueou o cliente de usar o sistema, "medio" = causou retrabalho ou confusão, "baixo" = inconveniente menor; ' +
                'status: "resolvido" = foi resolvido na reunião, "escalado_suporte" = CS acionou suporte ou abriu chamado, ' +
                '"em_aberto" = ficou sem resolução, "aguardando_cliente" = cliente precisa fazer algo; ' +
                'frase_cliente = trecho exato ou próximo do que o cliente disse sobre o problema (se houver). ' +
                'Se não houver nenhum bug ou erro, retorne tem_bugs false e array vazio.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    tem_bugs: { type: Type.BOOLEAN },
                    bugs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                descricao:     { type: Type.STRING },
                                contexto:      { type: Type.STRING },
                                impacto:       { type: Type.STRING },
                                status:        { type: Type.STRING },
                                frase_cliente: { type: Type.STRING },
                            },
                            required: ['descricao', 'impacto', 'status'],
                        },
                    },
                },
                required: ['tem_bugs', 'bugs'],
            },
        },
    });
    const parsed = safeParse(safeText(res, 'getBugs'), 'getBugs');
    parsed.bugs = parsed.bugs || [];
    parsed.tem_bugs = parsed.bugs.length > 0;
    return parsed;
}

async function getMelhorias(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Sua tarefa tem duas partes:\n' +
                '(1) Identifique o produto Nibo principal desta reunião.\n' +
                'Os produtos Nibo são:\n' +
                '- Obrigações (Nibo Obrigações Plus): gestão de obrigações fiscais e acessórias do escritório contábil, ' +
                'calendário de vencimentos, lista de obrigações, tarefas e processos internos, documentos recebidos do cliente, ' +
                'comunicados, atendimento/relacionamento com o cliente pelo portal (Nibo Empresa / app), ' +
                'robôs e automações (FGTS Digital, eSocial, DAS, DARF, guias), relatórios de produtividade da equipe, ' +
                'departamentos, responsáveis por cliente, grupos de clientes, onboarding contábil.\n' +
                '- Radar e-CAC (Nibo Radar e-CAC): consulta centralizada ao e-CAC da Receita Federal, ' +
                'caixa postal fiscal federal, situação fiscal, CND/certidão negativa de débitos federais, ' +
                'parcelamentos (Simples Nacional, MEI, PERT, RELP, DAS, DARF parcelado), ' +
                'pagamento verificado pela Receita, procuração eletrônica, certificado digital do escritório para e-CAC, ' +
                'monitoramento de intimações e pendências fiscais federais.\n' +
                '- Gestão Financeira (Nibo Gestão Financeira): fluxo de caixa, DRE/resultado operacional, ' +
                'lançamentos financeiros, agendamentos de recebimento e pagamento, central de cobrança, ' +
                'boletos bancários, cobranças automáticas, recorrências, open finance/automação bancária, ' +
                'extrato bancário, conciliação bancária, importar OFX, categorias, plano de contas, ' +
                'relatórios financeiros, IA financeira (leitura de PDF, categorias sugeridas), fechamento de mês, ' +
                'centro de custo, rateio, CNAB, saldo de contas, contas e extratos.\n' +
                '- Emissor (Nibo Emissor de NFS-e — EXCLUSIVO para serviços): emissão de Nota Fiscal de Serviço ' +
                'Eletrônica (NFS-e), RPS (Recibo Provisório de Serviço), código de serviço, inscrição municipal, ' +
                'certificado digital de emissão, autenticação com prefeitura, habilitar emissor para cliente, ' +
                'perfil de serviço, alíquota, cancelamento de nota, data de competência, emissor nacional, ' +
                'emissão para tomador no exterior, nota negada/processando/cancelada, ' +
                'emissão automática de NFS-e em agendamentos, reforma tributária 2026 NFS-e. ' +
                'ATENÇÃO: o Emissor cobre APENAS NFS-e (serviços); NÃO inclui NF-e (produto) nem NFC-e (consumidor).\n' +
                '- BPO (Nibo BPO Financeiro): terceirização do financeiro do cliente pelo escritório contábil, ' +
                'caixa de entrada BPO, lançamentos em nome do cliente, integração com Google Drive/Dropbox/OneDrive, ' +
                'envio de documentos via WhatsApp para caixa de entrada, usuários e permissões BPO, ' +
                'conectar/desvincular empresa ao BPO.\n' +
                '- WhatsApp (Nibo WhatsApp Web/API): comunicação com o cliente via WhatsApp Business, ' +
                'envio de lembretes de cobrança por WhatsApp, triagem e atendimento por mensagem, ' +
                'envio de documentos pelo cliente via WhatsApp, WhatsApp API oficial.\n' +
                '- Outro: funcionalidade, módulo ou contexto que não se encaixa nos produtos acima.\n' +
                'Retorne o nome exato de um dos produtos listados. Se dois produtos forem igualmente centrais, ' +
                'retorne ambos separados por " + " (ex: "Obrigações + Emissor"). ' +
                'Se não identificar, retorne "Não identificado".\n' +
                '(2) Identifique sugestões de melhoria de produto mencionadas pelo cliente: ' +
                'funcionalidades pedidas, problemas de usabilidade relatados, integrações desejadas, ' +
                'relatórios que o cliente sentiu falta, fluxos de processo confusos ou lentos, ' +
                'comparações com outros sistemas ("no outro sistema tinha X", "seria bom se tivesse Y"). ' +
                'Para cada melhoria: ' +
                'descricao = o que o cliente quer ou precisa (objetiva, 1 frase); ' +
                'produto = qual produto Nibo se aplica (Obrigações, Radar e-CAC, Gestão Financeira, Emissor, BPO, WhatsApp, Outro); ' +
                'tipo = "funcionalidade" (feature nova pedida), "usabilidade" (interface/UX difícil), ' +
                '"integracao" (conexão com outro sistema), "processo" (fluxo confuso ou demorado), ' +
                '"relatorio" (relatório ou exportação desejada), "outro"; ' +
                'contexto = o que estava sendo feito quando surgiu a sugestão (1 frase curta); ' +
                'frase_cliente = trecho exato ou próximo do que o cliente disse. ' +
                'Se não houver nenhuma sugestão de melhoria, retorne tem_melhorias false e array vazio.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    produto_reuniao: { type: Type.STRING },
                    tem_melhorias:   { type: Type.BOOLEAN },
                    melhorias: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                descricao:     { type: Type.STRING },
                                produto:       { type: Type.STRING },
                                tipo:          { type: Type.STRING },
                                contexto:      { type: Type.STRING },
                                frase_cliente: { type: Type.STRING },
                            },
                            required: ['descricao', 'produto', 'tipo'],
                        },
                    },
                },
                required: ['produto_reuniao', 'tem_melhorias', 'melhorias'],
            },
        },
    });
    const parsed = safeParse(safeText(res, 'getMelhorias'), 'getMelhorias');
    parsed.melhorias = parsed.melhorias || [];
    parsed.tem_melhorias = parsed.melhorias.length > 0;
    parsed.produto_reuniao = parsed.produto_reuniao || 'Não identificado';
    return parsed;
}

async function getRelatorio(numbers, meta, texts, coordinator) {
    const linhas = CS_PILLARS.map(function(p) {
        const k = p[0], nota = numbers['nota_' + k];
        if (nota === null) return null;
        const pq = texts['porque_'   + k] || '';
        const ml = texts['melhoria_' + k] || '';
        const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
    }).filter(Boolean).join('\n');

    const coordinatorLine = coordinator ? `Coordenador responsável: **${coordinator}**\n\n` : '';
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
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const prompt      = req.body && req.body.prompt;
    const coordinator = req.body && req.body.coordinator;
    if (!prompt) return res.status(400).json({ error: 'Transcrição obrigatória.' });

    try {
        // ✅ Detecção dinâmica via Supabase
        const detectado = await detectAnalista(prompt);

        const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers');

        if (detectado) {
            numbers.analista_nome = detectado.nome;
            if (!coordinator) numbers.coordinator = detectado.coordinator;
        }
        numbers.analista_nome = numbers.analista_nome || 'Não identificado';
        numbers.coordinator   = coordinator || numbers.coordinator || null;

        const [meta, textsA, textsB, desalin, bugsResult, melhoriasResult] = await Promise.all([
            withRetry(() => getMeta(prompt, numbers),         'getMeta'),
            withRetry(() => getTextsA(prompt, numbers),       'getTextsA'),
            withRetry(() => getTextsB(prompt, numbers),       'getTextsB'),
            withRetry(() => getDesalinhamentos(prompt),       'getDesalinhamentos'),
            withRetry(() => getBugs(prompt),                  'getBugs'),
            withRetry(() => getMelhorias(prompt),             'getMelhorias'),
        ]);
        const texts = Object.assign({}, textsA, textsB);

        CS_PILLARS.forEach(function(p) {
            const k = p[0];
            if (numbers['nota_' + k] === null) {
                texts['porque_'   + k] = 'Sem evidência na transcrição.';
                texts['melhoria_' + k] = null;
            } else {
                texts['porque_'   + k] = texts['porque_'   + k] || 'Sem justificativa disponível.';
                texts['melhoria_' + k] = texts['melhoria_' + k] || (numbers['nota_' + k] === 5 ? 'Excelência atingida.' : 'Informação não disponível.');
            }
        });

        meta.nome_cliente     = meta.nome_cliente     || 'Não identificado';
        meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
        meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
        meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
        meta.sistemas_citados = meta.sistemas_citados || [];
        meta.pontos_fortes    = meta.pontos_fortes    || [];
        meta.pontos_atencao   = meta.pontos_atencao   || [];

        const justificativa_detalhada = await withRetry(
            () => getRelatorio(numbers, meta, texts, numbers.coordinator), 'getRelatorio'
        );

        return res.status(200).json(
            Object.assign({}, numbers, meta, texts, {
                justificativa_detalhada,
                coordinator: numbers.coordinator,
                analista_nome: numbers.analista_nome,
                data_reuniao: numbers.data_reuniao || null,
                nome_cliente: meta.nome_cliente,
                tem_desalinhamento:  desalin.tem_desalinhamento,
                desalinhamentos:     desalin.desalinhamentos,
                tem_bugs:            bugsResult.tem_bugs,
                bugs:                bugsResult.bugs,
                produto_reuniao:     melhoriasResult.produto_reuniao,
                tem_melhorias:       melhoriasResult.tem_melhorias,
                melhorias:           melhoriasResult.melhorias,
            })
        );

    } catch (error) {
        console.error('Erro na API:', error);
        const msg = error.message || String(error);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('8 RESOURCE')) {
            return res.status(503).json({ error: 'Cota do banco de dados excedida. Aguarde alguns minutos e tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + msg });
    }
}
