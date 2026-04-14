// api/feedback.js — salva correções "não é bug / não é desalinhamento"
// e alimenta o aprendizado dos prompts futuros
import { db, FieldValue } from '../lib/firebase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { tipo_original, item } = req.body || {};
    if (!tipo_original || !item || !item.descricao && !item.expectativa) {
        return res.status(400).json({ error: 'tipo_original e item obrigatórios' });
    }

    await db.collection('cs_feedbacks').add({
        tipo_original,                             // 'bug' | 'desalinhamento'
        descricao: item.descricao || item.expectativa || '',
        item,
        created_at: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ ok: true });
}
