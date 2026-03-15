// api/records.js — CS Auditor
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
    } catch (e) { console.error('getSession error:', e); return null; }
}

export default async function handler(req, res) {
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' });

    const { modo, id, nome } = req.body || {};
    let url;
    if (modo === 'nao_id') {
        url = `${SUPABASE_URL}/rest/v1/cs_reunioes?analista_nome=ilike.*identificado*`;
    } else if (modo === 'analista' && nome?.trim()) {
        url = `${SUPABASE_URL}/rest/v1/cs_reunioes?analista_nome=eq.${encodeURIComponent(nome.trim())}`;
    } else if (modo === 'single' && id) {
        url = `${SUPABASE_URL}/rest/v1/cs_reunioes?id=eq.${id}`;
    } else {
        return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    try {
        const r = await fetch(url, {
            method: 'DELETE',
            headers: { apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, Prefer:'return=representation', 'Content-Type':'application/json' }
        });
        if (!r.ok) return res.status(500).json({ error: 'Erro no banco: ' + await r.text() });
        const deleted = await r.json();
        return res.status(200).json({ ok: true, count: Array.isArray(deleted) ? deleted.length : 0 });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
