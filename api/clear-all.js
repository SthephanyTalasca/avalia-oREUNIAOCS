// api/clear-all.js — CS Auditor
// Deleta TODOS os registros de cs_reunioes. Restrito à Sthephany.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL  = 'sthephany.talasca@nibo.com.br';

function getSession(req) {
    const m = (req.headers.cookie || '').match(/nibo_cs_session=([^;]+)/);
    if (!m) return null;
    try {
        const s = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
        if (s.exp && Date.now() > s.exp) return null;
        if (s.email.toLowerCase().split('@')[1] !== 'nibo.com.br') return null;
        return s;
    } catch (e) { return null; }
}

export default async function handler(req, res) {
    if (req.method !== 'DELETE')
        return res.status(405).json({ error: 'Método não permitido' });

    const session = getSession(req);
    if (!session)
        return res.status(401).json({ error: 'Não autorizado' });

    // Restrição: só a Sthephany pode usar este endpoint
    if (session.email.toLowerCase() !== ADMIN_EMAIL)
        return res.status(403).json({ error: 'Acesso negado. Apenas a administradora pode limpar todos os dados.' });

    try {
        // Deleta tudo — o filtro id > 0 é necessário porque o Supabase
        // não permite DELETE sem filtro por segurança
        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_reunioes?id=gt.0`, {
            method: 'DELETE',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Prefer: 'return=representation',
                'Content-Type': 'application/json',
            }
        });

        if (!r.ok) return res.status(500).json({ error: 'Erro no banco: ' + await r.text() });

        const deleted = await r.json();
        console.log(`🗑️ Clear-all executado por ${session.email} — ${deleted.length} registros deletados`);

        return res.status(200).json({ ok: true, count: deleted.length });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
