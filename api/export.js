// api/export.js — CS Auditor
// GET /api/export?tipo=melhorias&coordenador=...&analista=...&periodo=...
// Retorna CSV com melhorias, desalinhamentos ou bugs extraídos do Firestore

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

function escCsv(v) {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? '"' + s + '"' : s;
}

function row(...cols) {
    return cols.map(escCsv).join(',') + '\r\n';
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    const { coordenador, analista, periodo, tipo = 'melhorias' } = req.query;

    try {
        let query = db.collection('cs_reunioes');
        if (coordenador) query = query.where('coordenador', '==', coordenador);

        const snap = await query.get();
        let reunioes = docsToArray(snap);

        if (analista) {
            const q = analista.split(' ')[0].toLowerCase();
            reunioes = reunioes.filter(r => (r.analista_nome || '').toLowerCase().includes(q));
        }

        if (periodo && periodo !== '0') {
            const since = new Date(Date.now() - parseInt(periodo) * 86400000);
            reunioes = reunioes.filter(r => {
                const d = r.data_reuniao || r.created_at;
                return d ? new Date(d) >= since : false;
            });
        }

        // ── Ordena por data decrescente ───────────────────────────────────
        reunioes.sort((a, b) => {
            const da = new Date(a.data_reuniao || a.created_at || 0);
            const db2 = new Date(b.data_reuniao || b.created_at || 0);
            return db2 - da;
        });

        let csv = '';
        const now = new Date().toISOString().slice(0, 10);

        if (tipo === 'desalinhamentos') {
            csv += row('Data Reunião','Analista','Coordenador','Cliente','Expectativa','Realidade','Frase do Cliente','Severidade','Como Tratado');
            for (const r of reunioes) {
                const itens = r.analise_json?.desalinhamentos || [];
                if (!itens.length) continue;
                for (const d of itens) {
                    csv += row(
                        r.data_reuniao || '',
                        r.analista_nome || '',
                        r.coordenador || '',
                        r.nome_cliente || '',
                        d.expectativa || '',
                        d.realidade || '',
                        d.frase_cliente || '',
                        d.severidade || '',
                        d.como_tratado || ''
                    );
                }
            }
            res.setHeader('Content-Disposition', `attachment; filename="desalinhamentos_${now}.csv"`);

        } else if (tipo === 'bugs') {
            csv += row('Data Reunião','Analista','Coordenador','Cliente','Produto','Descrição','Impacto','Frase do Cliente');
            for (const r of reunioes) {
                const itens = r.analise_json?.bugs || [];
                if (!itens.length) continue;
                for (const b of itens) {
                    csv += row(
                        r.data_reuniao || '',
                        r.analista_nome || '',
                        r.coordenador || '',
                        r.nome_cliente || '',
                        b.produto || '',
                        b.descricao || '',
                        b.impacto || '',
                        b.frase_cliente || ''
                    );
                }
            }
            res.setHeader('Content-Disposition', `attachment; filename="bugs_${now}.csv"`);

        } else {
            // melhorias (padrão)
            csv += row('Data Reunião','Analista','Coordenador','Cliente','Produto Reunião','Descrição','Produto','Tipo','Contexto','Frase do Cliente');
            for (const r of reunioes) {
                const itens = r.analise_json?.melhorias || [];
                if (!itens.length) continue;
                for (const m of itens) {
                    csv += row(
                        r.data_reuniao || '',
                        r.analista_nome || '',
                        r.coordenador || '',
                        r.nome_cliente || '',
                        r.produto_reuniao || r.analise_json?.produto_reuniao || '',
                        m.descricao || '',
                        m.produto || '',
                        m.tipo || '',
                        m.contexto || '',
                        m.frase_cliente || ''
                    );
                }
            }
            res.setHeader('Content-Disposition', `attachment; filename="melhorias_${now}.csv"`);
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // BOM para Excel abrir com acentos corretos
        return res.status(200).send('\uFEFF' + csv);

    } catch (e) {
        console.error('export error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
