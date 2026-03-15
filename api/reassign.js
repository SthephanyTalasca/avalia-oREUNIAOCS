// api/reassign.js — CS Auditor
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
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    const { reuniao_id, analista_nome } = req.body;
    if (!reuniao_id || !analista_nome?.trim())
        return res.status(400).json({ error: 'reuniao_id e analista_nome obrigatórios' });

    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_reunioes?id=eq.${reuniao_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Prefer:'return=representation' },
            body: JSON.stringify({ analista_nome: analista_nome.trim() })
        });
        if (!r.ok) return res.status(500).json({ error: 'Erro ao reatribuir: ' + await r.text() });
        return res.status(200).json({ ok: true, updated: (await r.json())[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
