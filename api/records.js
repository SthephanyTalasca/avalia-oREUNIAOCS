// api/records.js — CS Auditor
import { db } from './_firebase.js';

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
    } catch { return null; }
}

// Deleta docs em lotes de 500 (limite do Firestore batch)
async function batchDeleteIds(ids) {
    for (let i = 0; i < ids.length; i += 500) {
        const batch = db.batch();
        ids.slice(i, i + 500).forEach(id =>
            batch.delete(db.collection('cs_reunioes').doc(String(id)))
        );
        await batch.commit();
    }
}

// Atualiza docs em lotes de 500
async function batchUpdateIds(ids, updates) {
    for (let i = 0; i < ids.length; i += 500) {
        const batch = db.batch();
        ids.slice(i, i + 500).forEach(id =>
            batch.update(db.collection('cs_reunioes').doc(String(id)), updates)
        );
        await batch.commit();
    }
}

// Deleta todos os docs de um snapshot em lotes de 500
async function batchDeleteSnap(snapshot) {
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
        const batch = db.batch();
        docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

export default async function handler(req, res) {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Não autorizado' });

    const email = session.email.toLowerCase();

    // ── POST: ações em lote ──────────────────────────────────────────────
    if (req.method === 'POST') {
        if (!BATCH_EMAILS.includes(email))
            return res.status(403).json({ error: 'Sem permissão para edição em lote.' });

        const { action, ids, payload } = req.body || {};
        if (!action || !Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ error: 'action e ids são obrigatórios.' });

        if (action === 'delete' && email !== ADMIN_EMAIL)
            return res.status(403).json({ error: 'Apenas admin pode excluir em lote.' });

        try {
            if (action === 'delete') {
                await batchDeleteIds(ids);

            } else if (action === 'reassign_analista') {
                if (!payload?.analista_nome?.trim())
                    return res.status(400).json({ error: 'analista_nome obrigatório.' });
                await batchUpdateIds(ids, { analista_nome: payload.analista_nome.trim() });

            } else if (action === 'reassign_coordenador') {
                await batchUpdateIds(ids, { coordenador: payload?.coordenador || null });

            } else if (action === 'edit_data') {
                if (!payload?.data_reuniao)
                    return res.status(400).json({ error: 'data_reuniao obrigatória.' });
                await batchUpdateIds(ids, { data_reuniao: payload.data_reuniao });

            } else {
                return res.status(400).json({ error: 'action inválida.' });
            }

            return res.status(200).json({ ok: true, count: ids.length });

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

        try {
            let count = 0;

            if (modo === 'single' && id) {
                await db.collection('cs_reunioes').doc(String(id)).delete();
                count = 1;

            } else if (modo === 'analista' && nome?.trim()) {
                const snap = await db.collection('cs_reunioes')
                    .where('analista_nome', '==', nome.trim())
                    .get();
                await batchDeleteSnap(snap);
                count = snap.size;

            } else if (modo === 'nao_id') {
                const snap = await db.collection('cs_reunioes').get();
                const toDelete = snap.docs.filter(d =>
                    (d.data().analista_nome || '').toLowerCase().includes('identificado')
                );
                for (let i = 0; i < toDelete.length; i += 500) {
                    const batch = db.batch();
                    toDelete.slice(i, i + 500).forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
                count = toDelete.length;

            } else if (modo === 'all') {
                if (email !== ADMIN_EMAIL)
                    return res.status(403).json({ error: 'Acesso negado.' });
                const snap = await db.collection('cs_reunioes').get();
                await batchDeleteSnap(snap);
                count = snap.size;
                console.log(`🗑️ Clear-all por ${email} — ${count} registros deletados`);

            } else {
                return res.status(400).json({ error: 'Parâmetros inválidos.' });
            }

            return res.status(200).json({ ok: true, count });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
