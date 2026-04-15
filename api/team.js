// api/team.js — CS Auditor
// ?_route=coordinators  →  CRUD da coleção cs_coordenadores
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

function gerarAlias(nomeCompleto) {
    const lower = nomeCompleto.toLowerCase().trim();
    const partes = lower.split(/\s+/);
    const aliases = [lower];
    if (partes[0]?.length > 2) aliases.push(partes[0]);
    const semAcento = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!aliases.includes(semAcento)) aliases.push(semAcento);
    const primeiroSemAcento = partes[0]?.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (primeiroSemAcento && !aliases.includes(primeiroSemAcento)) aliases.push(primeiroSemAcento);
    return [...new Set(aliases)];
}

async function handleCoordinators(req, res) {
    if (req.method === 'GET') {
        let query = db.collection('cs_coordenadores');
        if (req.query.incluir_inativos !== '1') query = query.where('ativo', '==', true);
        const snap = await query.get();
        const coords = docsToArray(snap).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return res.status(200).json(coords);
    }
    if (req.method === 'POST') {
        const { nome } = req.body;
        if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
        const snap = await db.collection('cs_coordenadores').get();
        const existing = docsToArray(snap).find(c => c.nome?.toLowerCase() === nome.trim().toLowerCase());
        if (existing) {
            if (existing.ativo) return res.status(409).json({ error: 'Coordenador já cadastrado.' });
            await db.collection('cs_coordenadores').doc(existing.id).update({ ativo: true });
            return res.status(200).json({ ok: true, reativado: true, coordenador: { ...existing, ativo: true } });
        }
        const docRef = await db.collection('cs_coordenadores').add({ nome: nome.trim(), ativo: true });
        return res.status(200).json({ ok: true, reativado: false, coordenador: { id: docRef.id, nome: nome.trim(), ativo: true } });
    }
    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        await db.collection('cs_coordenadores').doc(String(id)).update({ ativo: false });
        return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não permitido' });
}

export default async function handler(req, res) {
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    if (req.query._route === 'coordinators') return handleCoordinators(req, res);

    if (req.method === 'GET') {
        let query = db.collection('cs_membros');
        if (req.query.incluir_inativos !== '1') query = query.where('ativo', '==', true);
        const snap = await query.get();
        const membros = docsToArray(snap).sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''));
        return res.status(200).json(membros);
    }

    if (req.method === 'POST') {
        const { nome, coordenador } = req.body;
        if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

        const snap = await db.collection('cs_membros').get();
        const existing = docsToArray(snap).find(m => m.nome_completo?.toLowerCase() === nome.trim().toLowerCase());

        if (existing) {
            if (existing.ativo) return res.status(409).json({ error: 'Analista já cadastrado.' });
            await db.collection('cs_membros').doc(existing.id).update({ ativo: true, coordenador: coordenador || existing.coordenador || null });
            return res.status(200).json({ ok: true, reativado: true });
        }

        const docId = nome.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        await db.collection('cs_membros').doc(docId).set({
            nome_completo: nome.trim(),
            alias: gerarAlias(nome.trim()),
            coordenador: coordenador || null,
            ativo: true,
        });
        return res.status(200).json({ ok: true, reativado: false });
    }

    if (req.method === 'PATCH') {
        const { id, nome, coordenador } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });

        const updates = {};
        if (nome !== undefined) {
            updates.nome_completo = nome.trim();
            updates.alias = gerarAlias(nome.trim());
        }
        if (coordenador !== undefined) updates.coordenador = coordenador || null;

        await db.collection('cs_membros').doc(String(id)).update(updates);
        return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id obrigatório' });
        await db.collection('cs_membros').doc(String(id)).update({ ativo: false });
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
