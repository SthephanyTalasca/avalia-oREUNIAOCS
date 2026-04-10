// api/reassign.js — CS Auditor
import { db } from './firebase.js';

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
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

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
