// api/records.js — CS Auditor
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL  = 'sthephany.talasca@nibo.com.br';

const BATCH_EMAILS = ['sthephany.talasca@nibo.com.br'];

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

const H = (extra = {}) => ({
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: 'return=representation',
    ...extra
});

export default async function handler(req, res) {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Não autorizado' });

    const email = session.email.toLowerCase();

    // ── POST: ações em lote (antes chamava /api/batch) ──────────────────
    if (req.method === 'POST') {
        if (!BATCH_EMAILS.includes(email))
            return res.status(403).json({ error: 'Sem permissão para edição em lote.' });

        const { action, ids, payload } = req.body || {};
        if (!action || !Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ error: 'action e ids são obrigatórios.' });

        if (action === 'delete' && email !== ADMIN_EMAIL)
            return res.status(403).json({ error: 'Apenas admin pode excluir em lote.' });

        try {
            const idList = ids.map(Number).filter(Boolean).join(',');
            if (!idList) return res.status(400).json({ error: 'IDs inválidos.' });
            const url = `${SUPABASE_URL}/rest/v1/cs_reunioes?id=in.(${idList})`;
            let result;

            if (action === 'delete') {
                const r = await fetch(url, { method: 'DELETE', headers: H() });
                const txt = await r.text();
                if (!r.ok) throw new Error('Supabase: ' + txt);
                result = txt ? JSON.parse(txt) : [];

            } else if (action === 'reassign_analista') {
                if (!payload?.analista_nome?.trim())
                    return res.status(400).json({ error: 'analista_nome obrigatório.' });
                const r = await fetch(url, { method: 'PATCH', headers: H(), body: JSON.stringify({ analista_nome: payload.analista_nome.trim() }) });
                const txt = await r.text();
                if (!r.ok) throw new Error('Supabase: ' + txt);
                result = txt ? JSON.parse(txt) : [];

            } else if (action === 'reassign_coordenador') {
                const r = await fetch(url, { method: 'PATCH', headers: H(), body: JSON.stringify({ coordenador: payload?.coordenador || null }) });
                const txt = await r.text();
                if (!r.ok) throw new Error('Supabase: ' + txt);
                result = txt ? JSON.parse(txt) : [];

            } else if (action === 'edit_data') {
                if (!payload?.data_reuniao)
                    return res.status(400).json({ error: 'data_reuniao obrigatória.' });
                const r = await fetch(url, { method: 'PATCH', headers: H(), body: JSON.stringify({ data_reuniao: payload.data_reuniao }) });
                const txt = await r.text();
                if (!r.ok) throw new Error('Supabase: ' + txt);
                result = txt ? JSON.parse(txt) : [];

            } else {
                return res.status(400).json({ error: 'action inválida.' });
            }

            return res.status(200).json({ ok: true, count: Array.isArray(result) ? result.length : ids.length });

        } catch (err) {
            console.error('Batch error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    // ── DELETE: exclusão individual ou em lote simples ───────────────────
    if (req.method === 'DELETE') {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch { body = {}; }
        }
        body = body || {};

        const { modo, id, nome } = body;
        let url;

        if (modo === 'nao_id') {
            url = `${SUPABASE_URL}/rest/v1/cs_reunioes?analista_nome=ilike.*identificado*`;
        } else if (modo === 'analista' && nome?.trim()) {
            url = `${SUPABASE_URL}/rest/v1/cs_reunioes?analista_nome=eq.${encodeURIComponent(nome.trim())}`;
        } else if (modo === 'single' && id) {
            url = `${SUPABASE_URL}/rest/v1/cs_reunioes?id=eq.${id}`;
        } else if (modo === 'all') {
            if (email !== ADMIN_EMAIL)
                return res.status(403).json({ error: 'Acesso negado.' });
            url = `${SUPABASE_URL}/rest/v1/cs_reunioes?id=gt.0`;
        } else {
            return res.status(400).json({ error: 'Parâmetros inválidos.' });
        }

        try {
            const r = await fetch(url, { method: 'DELETE', headers: H() });
            if (!r.ok) return res.status(500).json({ error: 'Erro no banco: ' + await r.text() });
            const deleted = await r.json();
            if (modo === 'all') console.log(`🗑️ Clear-all por ${email} — ${deleted.length} registros deletados`);
            return res.status(200).json({ ok: true, count: Array.isArray(deleted) ? deleted.length : 0 });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
