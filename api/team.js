// api/team.js — CS Auditor
import { db, docsToArray } from '../lib/firebase.js';

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

export default async function handler(req, res) {
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    // GET — listar analistas
    if (req.method === 'GET') {
        let query = db.collection('cs_analistas');
        if (req.query.incluir_inativos !== '1') query = query.where('ativo', '==', true);
        const snap = await query.get();
        const analistas = docsToArray(snap).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return res.status(200).json(analistas);
    }

    // POST — criar analista
    if (req.method === 'POST') {
        const { nome, coordenador } = req.body;
        if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

        // Verifica existente (case-insensitive via fetch all)
        const snap = await db.collection('cs_analistas').get();
        const existing = docsToArray(snap).find(a => a.nome?.toLowerCase() === nome.trim().toLowerCase());

        if (existing) {
            if (existing.ativo) return res.status(409).json({ error: 'Analista já cadastrado.' });
            // Reativar
            const updates = { ativo: true, coordenador: coordenador || existing.coordenador || null };
            await db.collection('cs_analistas').doc(existing.id).update(updates);
            return res.status(200).json({ ok: true, reativado: true, analista: { ...existing, ...updates } });
        }

        const docRef = await db.collection('cs_analistas').add({
            nome: nome.trim(),
            coordenador: coordenador || null,
            ativo: true,
        });
        return res.status(200).json({
            ok: true,
            reativado: false,
            analista: { id: docRef.id, nome: nome.trim(), coordenador: coordenador || null, ativo: true },
        });
    }

    // PATCH — editar analista
    if (req.method === 'PATCH') {
        const { id, nome, coordenador } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });

        const updates = {};
        if (nome !== undefined) updates.nome = nome.trim();
        if (coordenador !== undefined) updates.coordenador = coordenador || null;

        const ref = db.collection('cs_analistas').doc(String(id));
        await ref.update(updates);
        const doc = await ref.get();
        return res.status(200).json({ ok: true, analista: { id: doc.id, ...doc.data() } });
    }

    // DELETE — desativar analista
    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        await db.collection('cs_analistas').doc(String(id)).update({ ativo: false });
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
