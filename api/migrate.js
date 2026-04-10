// api/migrate.js — CS Auditor
// POST /api/migrate { action: 'normalize_names' }
// Normaliza analista_nome e coordenador de todos os registros via cs_membros.
// Apenas admin pode executar.

import { db, docsToArray } from './firebase.js';
import { getConfig } from './config.js';

const ADMIN_EMAIL = 'sthephany.talasca@nibo.com.br';

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

function resolverNome(rawNome, CS_TO_COORDINATOR, CS_NOME_LOOKUP) {
    if (!rawNome) return null;
    const lower = rawNome.toLowerCase().trim();
    if (CS_TO_COORDINATOR[lower]) {
        return { nome: CS_NOME_LOOKUP[lower] || rawNome, coordenador: CS_TO_COORDINATOR[lower] };
    }
    const sorted = Object.keys(CS_TO_COORDINATOR).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (lower.includes(key) || key.includes(lower)) {
            return { nome: CS_NOME_LOOKUP[key] || rawNome, coordenador: CS_TO_COORDINATOR[key] };
        }
    }
    return null;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Não autorizado' });
    if (session.email.toLowerCase() !== ADMIN_EMAIL)
        return res.status(403).json({ error: 'Apenas admin pode executar migrações.' });

    const { action } = req.body || {};
    if (action !== 'normalize_names')
        return res.status(400).json({ error: 'action inválida. Use: normalize_names' });

    try {
        const { CS_TO_COORDINATOR, CS_NOME_LOOKUP } = await getConfig();

        // 1. Busca todos os registros (paginado)
        let allRecords = [];
        let lastDoc = null;
        const pageSize = 1000;

        while (true) {
            let q = db.collection('cs_reunioes')
                .select('analista_nome', 'coordenador')
                .orderBy('__name__')
                .limit(pageSize);
            if (lastDoc) q = q.startAfter(lastDoc);
            const snap = await q.get();
            if (snap.empty) break;
            snap.docs.forEach(d => allRecords.push({ id: d.id, ...d.data() }));
            lastDoc = snap.docs[snap.docs.length - 1];
            if (snap.docs.length < pageSize) break;
        }

        // 2. Determina quais precisam de correção
        const toUpdate = [];
        for (const rec of allRecords) {
            const resolved = resolverNome(rec.analista_nome, CS_TO_COORDINATOR, CS_NOME_LOOKUP);
            if (!resolved) continue;
            if (rec.analista_nome !== resolved.nome || rec.coordenador !== resolved.coordenador) {
                toUpdate.push({ id: rec.id, analista_nome: resolved.nome, coordenador: resolved.coordenador });
            }
        }

        if (!toUpdate.length) {
            return res.status(200).json({ ok: true, total: allRecords.length, updated: 0, message: 'Nenhum registro precisou de correção.' });
        }

        // 3. Atualiza em lotes de 500 (limite do Firestore batch)
        let updatedCount = 0;
        for (let i = 0; i < toUpdate.length; i += 500) {
            const batch = db.batch();
            toUpdate.slice(i, i + 500).forEach(r => {
                batch.update(db.collection('cs_reunioes').doc(r.id), {
                    analista_nome: r.analista_nome,
                    coordenador:   r.coordenador,
                });
            });
            await batch.commit();
            updatedCount += Math.min(500, toUpdate.length - i);
        }

        console.log(`migrate/normalize_names: ${updatedCount}/${allRecords.length} registros corrigidos por ${session.email}`);
        return res.status(200).json({
            ok: true,
            total:   allRecords.length,
            updated: updatedCount,
            message: `${updatedCount} registro(s) corrigido(s) de ${allRecords.length} total.`,
        });

    } catch (err) {
        console.error('migrate error:', err);
        return res.status(500).json({ error: err.message });
    }
}
