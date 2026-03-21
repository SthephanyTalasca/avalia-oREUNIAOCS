// api/config.js — CS Auditor
// Serve pilares e membros dinamicamente do Supabase.
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

  const [rPilares, rMembros] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/cs_pilares?select=*&ativo=eq.true&order=ordem.asc`, { headers: H() }),
    fetch(`${SUPABASE_URL}/rest/v1/cs_membros?select=*&ativo=eq.true`, { headers: H() }),
  ]);

  if (!rPilares.ok) throw new Error('Erro ao buscar pilares: ' + await rPilares.text());
  if (!rMembros.ok) throw new Error('Erro ao buscar membros: ' + await rMembros.text());

  const pilares = await rPilares.json();
  const membros = await rMembros.json();

  // Monta ALL_PILLARS no formato que analyze.js e ingest.js usam: [['key', 'Label'], ...]
  const ALL_PILLARS = pilares.map(p => [p.key, p.label]);

  // Monta bloco de critérios para o prompt do Gemini
  // Ex: "- Consultividade: Age como parceira... | 1=... | 3=... | 5=..."
  const PILLARS_PROMPT = pilares.map(p => {
    const r = p.rubrica || {};
    const notas = [1, 3, 5].map(n => r[String(n)] ? `${n}=${r[String(n)]}` : null).filter(Boolean).join(' | ');
    return `- ${p.label}${p.descricao ? ': ' + p.descricao : ''}${notas ? '\n  Escala → ' + notas : ''}`;
  }).join('\n');

  // Monta CS_TO_COORDINATOR no formato que os scripts usam: { 'alias': 'Coordenador', ... }
  const CS_TO_COORDINATOR = {};
  for (const m of membros) {
    for (const alias of (m.alias || [])) {
      CS_TO_COORDINATOR[alias.toLowerCase()] = m.coordenador;
    }
    // Também indexa pelo nome completo em lowercase
    CS_TO_COORDINATOR[m.nome_completo.toLowerCase()] = m.coordenador;
  }

  _cache = { pilares, membros, ALL_PILLARS, CS_TO_COORDINATOR, PILLARS_PROMPT };
  _cacheAt = Date.now();
  return _cache;
}

// Handler HTTP — usado pelo frontend para popular dropdowns e listas de pilares
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { pilares, membros } = await getConfig();
    return res.status(200).json({ pilares, membros });
  } catch (err) {
    console.error('❌ config error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
