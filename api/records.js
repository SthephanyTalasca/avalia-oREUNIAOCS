// api/records.js — CS Auditor
// Inclui lógica de migrate (normalize_names) — POST { action: 'normalize_names' } sem ids
import { db } from '../lib/firebase.js';
import { getConfig } from './config.js';

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

    // ── Rota: reassign individual (era reassign.js) ──────────────────────
    if (req.query._route === 'reassign') {
        if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido' });
        const { reuniao_id, analista_nome, coordenador_nome } = req.body;
        if (!reuniao_id || !analista_nome?.trim())
            return res.status(400).json({ error: 'reuniao_id e analista_nome obrigatórios' });
        const updates = { analista_nome: analista_nome.trim() };
        if (coordenador_nome !== undefined) updates.coordenador = coordenador_nome.trim() || null;
        try {
            const ref = db.collection('cs_reunioes').doc(String(reuniao_id));
            await ref.update(updates);
            const doc = await ref.get();
            return res.status(200).json({ ok: true, updated: { id: doc.id, ...doc.data() } });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ── POST: ações em lote ──────────────────────────────────────────────
    if (req.method === 'POST') {
        if (!BATCH_EMAILS.includes(email))
            return res.status(403).json({ error: 'Sem permissão para edição em lote.' });

        const { action, ids, payload } = req.body || {};
        if (!action) return res.status(400).json({ error: 'action obrigatória.' });

        // ── normalize_names: migração de nomes via cs_membros (admin only) ──
        if (action === 'normalize_names') {
            if (email !== ADMIN_EMAIL)
                return res.status(403).json({ error: 'Apenas admin pode executar migrações.' });
            try {
                const { CS_TO_COORDINATOR, CS_NOME_LOOKUP } = await getConfig();
                const sorted = Object.keys(CS_TO_COORDINATOR).sort((a, b) => b.length - a.length);

                function resolveNome(raw) {
                    if (!raw) return null;
                    const lower = raw.toLowerCase().trim();
                    if (CS_TO_COORDINATOR[lower])
                        return { nome: CS_NOME_LOOKUP[lower] || raw, coordenador: CS_TO_COORDINATOR[lower] };
                    for (const key of sorted) {
                        if (lower.includes(key) || key.includes(lower))
                            return { nome: CS_NOME_LOOKUP[key] || raw, coordenador: CS_TO_COORDINATOR[key] };
                    }
                    return null;
                }

                let allRecs = [], lastDoc = null;
                while (true) {
                    let q = db.collection('cs_reunioes').select('analista_nome', 'coordenador').orderBy('__name__').limit(1000);
                    if (lastDoc) q = q.startAfter(lastDoc);
                    const snap = await q.get();
                    if (snap.empty) break;
                    snap.docs.forEach(d => allRecs.push({ id: d.id, ...d.data() }));
                    lastDoc = snap.docs[snap.docs.length - 1];
                    if (snap.docs.length < 1000) break;
                }

                const toUpdate = allRecs.reduce((acc, rec) => {
                    const r = resolveNome(rec.analista_nome);
                    if (r && (rec.analista_nome !== r.nome || rec.coordenador !== r.coordenador))
                        acc.push({ id: rec.id, analista_nome: r.nome, coordenador: r.coordenador });
                    return acc;
                }, []);

                for (let i = 0; i < toUpdate.length; i += 500) {
                    const batch = db.batch();
                    toUpdate.slice(i, i + 500).forEach(r =>
                        batch.update(db.collection('cs_reunioes').doc(r.id), { analista_nome: r.analista_nome, coordenador: r.coordenador })
                    );
                    await batch.commit();
                }

                return res.status(200).json({ ok: true, total: allRecs.length, updated: toUpdate.length });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }

        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ error: 'ids obrigatórios.' });

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
