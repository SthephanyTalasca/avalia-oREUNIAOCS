// api/config.js — CS Auditor
// Serve pilares, membros e prompts dinamicamente do Firestore.
// Usado por analyze.js, ingest.js, dashboard.js e os HTMLs.

import { db, docsToArray } from './_firebase.js';

// Cache em memória por 5 minutos (evita bater no Firestore a cada análise)
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getConfig() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const [pilSnap, memSnap, prmSnap] = await Promise.all([
    db.collection('cs_pilares').where('ativo', '==', true).get(),
    db.collection('cs_membros').where('ativo', '==', true).get(),
    db.collection('cs_prompts').where('ativo', '==', true).get(),
  ]);

  const pilares    = docsToArray(pilSnap).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const membros    = docsToArray(memSnap);
  const promptsRaw = docsToArray(prmSnap);

  // Transforma array em objeto { chave: conteudo } para acesso fácil
  const PROMPTS = {};
  for (const p of promptsRaw) PROMPTS[p.chave] = p.conteudo;

  // Monta ALL_PILLARS no formato [['key', 'Label'], ...]
  const ALL_PILLARS = pilares.map(p => [p.key, p.label]);

  // Monta bloco de critérios para o prompt do Gemini
  const PILLARS_PROMPT = pilares.map(p => {
    const r = p.rubrica || {};
    const notas = [1, 3, 5].map(n => r[String(n)] ? `${n}=${r[String(n)]}` : null).filter(Boolean).join(' | ');
    return `- ${p.label}${p.descricao ? ': ' + p.descricao : ''}${notas ? '\n  Escala → ' + notas : ''}`;
  }).join('\n');

  // Monta CS_TO_COORDINATOR e CS_NOME_LOOKUP a partir dos aliases
  const CS_TO_COORDINATOR = {};
  const CS_NOME_LOOKUP    = {};
  for (const m of membros) {
    const nomeCanon = m.nome_completo.trim();
    for (const alias of (m.alias || [])) {
      const key = alias.toLowerCase().trim();
      CS_TO_COORDINATOR[key] = m.coordenador;
      CS_NOME_LOOKUP[key]    = nomeCanon;
    }
    const fullKey = nomeCanon.toLowerCase();
    CS_TO_COORDINATOR[fullKey] = m.coordenador;
    CS_NOME_LOOKUP[fullKey]    = nomeCanon;
  }

  _cache = { pilares, membros, ALL_PILLARS, CS_TO_COORDINATOR, CS_NOME_LOOKUP, PILLARS_PROMPT, PROMPTS };
  _cacheAt = Date.now();
  return _cache;
}

// Handler HTTP — usado pelo frontend para popular dropdowns e listas de pilares
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { pilares, membros, PROMPTS } = await getConfig();
    return res.status(200).json({ pilares, membros, prompts: PROMPTS });
  } catch (err) {
    console.error('❌ config error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
