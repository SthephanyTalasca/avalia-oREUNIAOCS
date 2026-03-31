// api/config.js — CS Auditor
// Serve pilares, membros e prompts dinamicamente do Supabase.
// Usado por analyze.js, ingest.js, dashboard.js e os HTMLs.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const H = () => ({
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

// Cache em memória por 5 minutos (evita bater no Supabase a cada análise)
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getConfig() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const [rPilares, rMembros, rPrompts] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/cs_pilares?select=*&ativo=eq.true&order=ordem.asc`, { headers: H() }),
    fetch(`${SUPABASE_URL}/rest/v1/cs_membros?select=*&ativo=eq.true`, { headers: H() }),
    fetch(`${SUPABASE_URL}/rest/v1/cs_prompts?select=*&ativo=eq.true`, { headers: H() }),
  ]);

  if (!rPilares.ok) throw new Error('Erro ao buscar pilares: ' + await rPilares.text());
  if (!rMembros.ok) throw new Error('Erro ao buscar membros: ' + await rMembros.text());
  if (!rPrompts.ok) throw new Error('Erro ao buscar prompts: ' + await rPrompts.text());

  const pilares     = await rPilares.json();
  const membros     = await rMembros.json();
  const promptsRaw  = await rPrompts.json();

  // Transforma array em objeto { chave: conteudo } para acesso fácil
  // Ex: PROMPTS['instrucao_avaliacao'] => '...'
  const PROMPTS = {};
  for (const p of promptsRaw) PROMPTS[p.chave] = p.conteudo;

  // Monta ALL_PILLARS no formato [['key', 'Label'], ...]
  const ALL_PILLARS = pilares.map(p => [p.key, p.label]);

  // Monta bloco de critérios para o prompt do Gemini
  // Ex: "- Consultividade: Age como parceira...\n  Escala → 1=... | 3=... | 5=..."
  const PILLARS_PROMPT = pilares.map(p => {
    const r = p.rubrica || {};
    const notas = [1, 3, 5].map(n => r[String(n)] ? `${n}=${r[String(n)]}` : null).filter(Boolean).join(' | ');
    return `- ${p.label}${p.descricao ? ': ' + p.descricao : ''}${notas ? '\n  Escala → ' + notas : ''}`;
  }).join('\n');

  // Monta CS_TO_COORDINATOR { 'alias_lower': 'Coordenador', ... }
  // Monta CS_NOME_LOOKUP     { 'alias_lower': 'Nome Completo Canônico', ... }
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
