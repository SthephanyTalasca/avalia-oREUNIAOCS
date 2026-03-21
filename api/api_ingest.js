// api/ingest.js — CS Auditor
// Endpoint chamado pelo Apps Script quando uma transcrição nova cai no Drive.
// Não exige sessão de browser; usa INGEST_SECRET para autenticar o script.

import { GoogleGenAI } from '@google/genai';

export const maxDuration = 300;

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } }
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // usa service role, não anon
const INGEST_SECRET = process.env.INGEST_SECRET;            // chave que o Apps Script manda

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

// ─── Helpers de extração de texto ────────────────────────────────────────────
function extractText(response) {
  if (typeof response?.text === 'function') {
    try { return response.text(); } catch {}
  }
  if (typeof response?.text === 'string') return response.text;
  if (typeof response?.response?.text === 'function') {
    try { return response.response.text(); } catch {}
  }
  if (Array.isArray(response?.candidates) && response.candidates[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  if (typeof response === 'string') return response;
  throw new Error('EXTRACT_TEXT_FAILED');
}

function cleanJson(text) {
  if (!text) return '';
  let s = text.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) s = m[1].trim();
  s = s.replace(/^`+|`+$/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) s = s.substring(a, b + 1);
  return s.trim();
}

function repairJson(raw) {
  if (!raw) return '{}';
  let s = raw.trimEnd().replace(/,\s*$/, '').replace(/"[^"]*$/, '').replace(/:\s*$/, '').replace(/,\s*$/, '');
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }
  return s;
}

function safeParse(text, label) {
  const cleaned = cleanJson(text);
  if (!cleaned) throw new Error(`${label}: texto vazio`);
  try { return JSON.parse(cleaned); } catch {
    try { return JSON.parse(repairJson(cleaned)); }
    catch { throw new Error(`JSON_PARSE_FAILED: ${label}`); }
  }
}

async function withRetry(fn, label, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

// ─── Chamadas Gemini (reutiliza a mesma lógica do analyze.js) ────────────────
async function getNumbers(transcript) {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Analise esta transcrição de reunião de CS e retorne as notas.

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON (sem texto adicional, sem markdown):
{
  "media_final": 3.5,
  "tempo_fala_cs_pct": 60,
  "tempo_fala_cliente_pct": 40,
  "nota_consultividade": 4,
  "nota_escuta_ativa": 3,
  "nota_jornada_cliente": 4,
  "nota_encantamento": 3,
  "nota_objecoes": -1,
  "nota_rapport": 4,
  "nota_autoridade": 3,
  "nota_postura": 4,
  "nota_gestao_tempo": 4,
  "nota_contextualizacao": 3,
  "nota_clareza": 4,
  "nota_objetividade": 4,
  "nota_flexibilidade": 3,
  "nota_dominio_produto": 4,
  "nota_dominio_negocio": 3,
  "nota_ecossistema_nibo": -1,
  "nota_universo_contabil": -1,
  "ck_prazo": true,
  "ck_dever_casa": false,
  "ck_certificado": true,
  "ck_proximo_passo": true,
  "ck_dor_vendas": false,
  "ck_suporte": true
}
Use -1 quando não houver evidência. Notas de 1 a 5 (inteiros). media_final = média das notas válidas.` }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  });
  const parsed = safeParse(extractText(res), 'getNumbers');
  ALL_PILLARS.forEach(([k]) => {
    let n = parsed['nota_' + k];
    if (n === -1 || n === '-1') { parsed['nota_' + k] = null; return; }
    if (n !== null && n !== undefined) {
      n = Math.min(5, Math.max(1, Math.round(Number(n))));
      parsed['nota_' + k] = isNaN(n) ? null : n;
    }
  });
  parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct || 50) + '%';
  parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
  parsed.checklist_cs = {
    definiu_prazo_implementacao: Boolean(parsed.ck_prazo),
    alinhou_dever_de_casa:       Boolean(parsed.ck_dever_casa),
    validou_certificado_digital: Boolean(parsed.ck_certificado),
    agendou_proximo_passo:       Boolean(parsed.ck_proximo_passo),
    conectou_com_dor_vendas:     Boolean(parsed.ck_dor_vendas),
    explicou_canal_suporte:      Boolean(parsed.ck_suporte),
  };
  return parsed;
}

async function getMeta(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(([k]) => numbers['nota_' + k] !== null)
    .map(([k, l]) => `${l}: ${numbers['nota_' + k]}/5`).join(', ');
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Analise esta transcrição de CS. Notas: ${notasStr}.

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON:
{
  "resumo_executivo": "Uma frase resumindo o onboarding",
  "saude_cliente": "Uma frase sobre saúde do cliente",
  "risco_churn": "Uma frase sobre risco de churn",
  "sistemas_citados": ["sistema1"],
  "pontos_fortes": ["ponto forte 1"],
  "pontos_atencao": ["ponto de atenção 1"]
}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  });
  return safeParse(extractText(res), 'getMeta');
}

async function getTexts(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(([k]) => numbers['nota_' + k] !== null)
    .map(([k, l]) => `${l}: ${numbers['nota_' + k]}/5`).join(', ');

  const [resA, resB] = await Promise.all([
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Justifique as notas de CS: ${notasStr}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON com porque_ e melhoria_ para os primeiros 9 pilares:
{
  "porque_consultividade":"j","melhoria_consultividade":"s",
  "porque_escuta_ativa":"j","melhoria_escuta_ativa":"s",
  "porque_jornada_cliente":"j","melhoria_jornada_cliente":"s",
  "porque_encantamento":"j","melhoria_encantamento":"s",
  "porque_objecoes":"j","melhoria_objecoes":"s",
  "porque_rapport":"j","melhoria_rapport":"s",
  "porque_autoridade":"j","melhoria_autoridade":"s",
  "porque_postura":"j","melhoria_postura":"s",
  "porque_gestao_tempo":"j","melhoria_gestao_tempo":"s"
}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 3000, responseMimeType: 'application/json' },
    }),
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Justifique as notas de CS: ${notasStr}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON com porque_ e melhoria_ para os últimos 8 pilares:
{
  "porque_contextualizacao":"j","melhoria_contextualizacao":"s",
  "porque_clareza":"j","melhoria_clareza":"s",
  "porque_objetividade":"j","melhoria_objetividade":"s",
  "porque_flexibilidade":"j","melhoria_flexibilidade":"s",
  "porque_dominio_produto":"j","melhoria_dominio_produto":"s",
  "porque_dominio_negocio":"j","melhoria_dominio_negocio":"s",
  "porque_ecossistema_nibo":"j","melhoria_ecossistema_nibo":"s",
  "porque_universo_contabil":"j","melhoria_universo_contabil":"s"
}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 3000, responseMimeType: 'application/json' },
    }),
  ]);
  return { ...safeParse(extractText(resA), 'textsA'), ...safeParse(extractText(resB), 'textsB') };
}

async function getRelatorio(numbers, meta, texts) {
  const linhas = ALL_PILLARS.map(([k, l]) => {
    const nota = numbers['nota_' + k];
    if (nota === null) return null;
    const pq = texts['porque_' + k] || '';
    const ml = texts['melhoria_' + k] || '';
    const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
    return `- **${l}**: ${nota}/5 — ${pq}${suf}`;
  }).filter(Boolean).join('\n');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Gere um feedback de CS em Markdown.

NOTAS:
${linhas}

Média: ${numbers.media_final}/5
Saúde: ${meta.saude_cliente}
Churn: ${meta.risco_churn}
Fortes: ${(meta.pontos_fortes || []).join('; ')}
Atenção: ${(meta.pontos_atencao || []).join('; ')}

Use esta estrutura:
## O que fez bem
## O que melhorar
## O que falar no 1:1
## Plano de ação` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });
  return extractText(res);
}

// ─── Detecta analista e coordenador pelo nome no texto ───────────────────────
const CS_TO_COORDINATOR = {
  'brayan santos': 'Sayuri', 'brayan': 'Sayuri',
  'camille vaz': 'Sayuri', 'camille': 'Sayuri',
  'carolina miranda': 'Sayuri', 'carolina': 'Sayuri',
  'isaque silva': 'Sayuri', 'isaque': 'Sayuri',
  'larissa mota': 'Sayuri',
  'nat vieira': 'Sayuri', 'nat': 'Sayuri',
  'vinícius oliveira': 'Sayuri', 'vinicius': 'Sayuri',
  'ana de battisti': 'Tayanara', 'ana battisti': 'Tayanara',
  'denis silva': 'Tayanara', 'denis': 'Tayanara',
  'larissa teixeira': 'Tayanara',
  'lorrayne moreira': 'Tayanara', 'lorrayne': 'Tayanara',
  'micaelle martins': 'Tayanara', 'micaelle': 'Tayanara',
  'sthephany talasca': 'Tayanara', 'sthephany': 'Tayanara', 'sthe': 'Tayanara',
  'thais silva': 'Tayanara', 'thais': 'Tayanara',
  'willian martins': 'Tayanara', 'willian': 'Tayanara',
  'yuri santos': 'Tayanara', 'yuri': 'Tayanara',
  'aline almeida': 'Michel', 'aline': 'Michel',
  'bianca kim': 'Michel', 'bianca': 'Michel',
  'jéssica barreiro': 'Michel', 'jessica barreiro': 'Michel',
  'julia rodrigues': 'Michel', 'julia': 'Michel',
  'maria fernanda costa': 'Michel', 'mafê': 'Michel',
  'maryana alves': 'Michel', 'maryana': 'Michel',
  'rafaele oliveira': 'Michel', 'rafaele': 'Michel',
  'túlio morgado': 'Michel', 'túlio': 'Michel', 'tulio': 'Michel',
};

function detectCS(text, folderName) {
  // Tenta detectar pelo nome da pasta (ex: "Sthephany Talasca")
  if (folderName) {
    const lower = folderName.toLowerCase();
    for (const [name, coord] of Object.entries(CS_TO_COORDINATOR)) {
      if (lower.includes(name)) {
        return { analista: folderName.trim(), coordenador: coord };
      }
    }
  }
  // Fallback: detecta na transcrição
  const lower = (text || '').toLowerCase();
  for (const [name, coord] of Object.entries(CS_TO_COORDINATOR)) {
    if (lower.includes(name)) {
      return { analista: name.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), coordenador: coord };
    }
  }
  return { analista: 'Não identificado', coordenador: null };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Autenticação por secret
  const secret = req.headers['x-ingest-secret'] || req.body?.secret;
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const {
    transcript,    // texto da transcrição (obrigatório)
    folder_name,   // nome da pasta do CS no Drive (ex: "Sthephany Talasca")
    file_name,     // nome do arquivo (para log)
    data_reuniao,  // ISO string da data da reunião (opcional, padrão = now)
    cliente_nome,  // nome do cliente (opcional)
    drive_file_id, // ID do arquivo no Drive (para evitar duplicatas)
  } = req.body || {};

  if (!transcript || transcript.trim().length < 50) {
    return res.status(400).json({ error: 'Transcrição muito curta ou ausente.' });
  }

  // Evita duplicata pelo drive_file_id
  if (drive_file_id) {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cs_reunioes?select=id&analise_json->>drive_file_id=eq.${drive_file_id}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing?.length > 0) {
        console.log(`⏭️ Arquivo já processado: ${drive_file_id}`);
        return res.status(200).json({ ok: true, skipped: true, message: 'Já processado anteriormente.' });
      }
    }
  }

  try {
    console.log(`📝 Iniciando ingest: ${file_name || 'sem nome'} | ${transcript.length} chars`);

    const { analista, coordenador } = detectCS(transcript, folder_name);
    console.log(`👤 Detectado: ${analista} / ${coordenador}`);

    const numbers = await withRetry(() => getNumbers(transcript), 'getNumbers', 3);
    const [meta, texts] = await Promise.all([
      withRetry(() => getMeta(transcript, numbers), 'getMeta', 2),
      withRetry(() => getTexts(transcript, numbers), 'getTexts', 2),
    ]);

    // Fallbacks
    ALL_PILLARS.forEach(([k]) => {
      if (numbers['nota_' + k] === null) {
        texts['porque_' + k] = texts['porque_' + k] || 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = '';
      } else {
        texts['porque_' + k] = texts['porque_' + k] || 'Sem justificativa disponível.';
        texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelência atingida.';
      }
    });
    meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
    meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
    meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
    meta.pontos_fortes    = meta.pontos_fortes    || [];
    meta.pontos_atencao   = meta.pontos_atencao   || [];

    const justificativa_detalhada = await withRetry(
      () => getRelatorio(numbers, meta, texts), 'getRelatorio', 2
    );

    const analise_json = {
      ...numbers, ...meta, ...texts,
      justificativa_detalhada,
      origem: 'drive_automatico',
      drive_file_id: drive_file_id || null,
      file_name: file_name || null,
    };

    const row = {
      coordenador:              coordenador || null,
      analista_nome:            analista,
      cliente_nome:             cliente_nome || null,
      media_final:              numbers.media_final || null,
      saude_cliente:            meta.saude_cliente,
      risco_churn:              meta.risco_churn,
      tempo_fala_cs:            numbers.tempo_fala_cs,
      tempo_fala_cliente:       numbers.tempo_fala_cliente,
      data_reuniao:             data_reuniao ? new Date(data_reuniao).toISOString() : new Date().toISOString(),
      nota_consultividade:      numbers.nota_consultividade,
      nota_escuta_ativa:        numbers.nota_escuta_ativa,
      nota_jornada_cliente:     numbers.nota_jornada_cliente,
      nota_encantamento:        numbers.nota_encantamento,
      nota_objecoes:            numbers.nota_objecoes,
      nota_rapport:             numbers.nota_rapport,
      nota_autoridade:          numbers.nota_autoridade,
      nota_postura:             numbers.nota_postura,
      nota_gestao_tempo:        numbers.nota_gestao_tempo,
      nota_contextualizacao:    numbers.nota_contextualizacao,
      nota_clareza:             numbers.nota_clareza,
      nota_objetividade:        numbers.nota_objetividade,
      nota_flexibilidade:       numbers.nota_flexibilidade,
      nota_dominio_produto:     numbers.nota_dominio_produto,
      nota_dominio_negocio:     numbers.nota_dominio_negocio,
      nota_ecossistema_nibo:    numbers.nota_ecossistema_nibo,
      nota_universo_contabil:   numbers.nota_universo_contabil,
      analise_json,
    };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/cs_reunioes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });

    if (!saveRes.ok) {
      const err = await saveRes.text();
      console.error('❌ Supabase error:', err);
      return res.status(500).json({ error: 'Erro ao salvar no banco: ' + err });
    }

    const saved = await saveRes.json();
    console.log(`✅ Salvo com ID: ${saved[0]?.id} | Analista: ${analista} | Média: ${numbers.media_final}`);

    return res.status(200).json({
      ok: true,
      id: saved[0]?.id,
      analista,
      coordenador,
      media_final: numbers.media_final,
    });

  } catch (error) {
    console.error('❌ Erro no ingest:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
