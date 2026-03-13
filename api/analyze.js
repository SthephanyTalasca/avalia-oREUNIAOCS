// api/analysts.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function getSession(req) {
    const m = (req.headers.cookie || '').match(/nibo_cs_session=([^;]+)/);
    if (!m) return null;
    try {
        const s = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
        if (s.exp && Date.now() > s.exp) return null;
        if (s.email.toLowerCase().split('@')[1] !== 'nibo.com.br') return null;
        return s;
    } catch { return null; }
}

const H = (extra = {}) => ({ 'Content-Type':'application/json', apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, ...extra });

export default async function handler(req, res) {
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    // GET
    if (req.method === 'GET') {
        const filter = req.query.incluir_inativos === '1' ? '' : '&ativo=eq.true';
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas?select=*&order=nome.asc${filter}`, { headers: H() });
        if (!r.ok) return res.status(500).json({ error: await r.text() });
        return res.status(200).json(await r.json());
    }

    // POST — criar ou reativar
    if (req.method === 'POST') {
        const { nome, coordenador } = req.body;
        if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
        const chk = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas?nome=ilike.${encodeURIComponent(nome.trim())}&select=*`, { headers: H() });
        const existing = await chk.json();
        if (existing?.length) {
            const an = existing[0];
            if (an.ativo) return res.status(409).json({ error: 'CS já cadastrado.' });
            const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas?id=eq.${an.id}`, { method:'PATCH', headers:H({Prefer:'return=representation'}), body:JSON.stringify({ ativo:true, coordenador: coordenador||an.coordenador||null }) });
            if (!r.ok) return res.status(500).json({ error: await r.text() });
            return res.status(200).json({ ok:true, reativado:true, analista:(await r.json())[0] });
        }
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas`, { method:'POST', headers:H({Prefer:'return=representation'}), body:JSON.stringify({ nome:nome.trim(), coordenador:coordenador||null, ativo:true }) });
        if (!r.ok) return res.status(500).json({ error: await r.text() });
        return res.status(200).json({ ok:true, reativado:false, analista:(await r.json())[0] });
    }

    // PATCH — editar
    if (req.method === 'PATCH') {
        const { id, nome, coordenador } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        const body = {};
        if (nome?.trim()) body.nome = nome.trim();
        if (coordenador !== undefined) body.coordenador = coordenador || null;
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas?id=eq.${id}`, { method:'PATCH', headers:H({Prefer:'return=representation'}), body:JSON.stringify(body) });
        if (!r.ok) return res.status(500).json({ error: await r.text() });
        return res.status(200).json({ ok:true, analista:(await r.json())[0] });
    }

    // DELETE — desativar
    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_analistas?id=eq.${id}`, { method:'PATCH', headers:H({Prefer:'return=representation'}), body:JSON.stringify({ativo:false}) });
        if (!r.ok) return res.status(500).json({ error: await r.text() });
        return res.status(200).json({ ok:true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
