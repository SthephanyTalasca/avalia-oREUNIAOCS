// api/coordinators.js — CS Auditor
import { db, docsToArray } from './_firebase.js';

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

    // GET — listar
    if (req.method === 'GET') {
        let query = db.collection('cs_coordenadores');
        if (req.query.incluir_inativos !== '1') query = query.where('ativo', '==', true);
        const snap = await query.get();
        const coords = docsToArray(snap).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return res.status(200).json(coords);
    }

    // POST — criar
    if (req.method === 'POST') {
        const { nome } = req.body;
        if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

        // Verifica existente (case-insensitive)
        const snap = await db.collection('cs_coordenadores').get();
        const existing = docsToArray(snap).find(c => c.nome?.toLowerCase() === nome.trim().toLowerCase());

        if (existing) {
            if (existing.ativo) return res.status(409).json({ error: 'Coordenador já cadastrado.' });
            await db.collection('cs_coordenadores').doc(existing.id).update({ ativo: true });
            return res.status(200).json({ ok: true, reativado: true, coordenador: { ...existing, ativo: true } });
        }

        const docRef = await db.collection('cs_coordenadores').add({ nome: nome.trim(), ativo: true });
        return res.status(200).json({
            ok: true,
            reativado: false,
            coordenador: { id: docRef.id, nome: nome.trim(), ativo: true },
        });
    }

    // DELETE — desativar
    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        await db.collection('cs_coordenadores').doc(String(id)).update({ ativo: false });
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
