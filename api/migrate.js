// api/migrate.js — CS Auditor
// POST /api/migrate { action: 'normalize_names' }
//   Busca todos os registros de cs_reunioes, resolve o nome canônico e o
//   coordenador correto via cs_membros (getConfig), e atualiza os registros
//   cujos valores estão divergentes.
//
// Apenas admin pode executar.

import { getConfig } from './config.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL  = 'sthephany.talasca@nibo.com.br';

const H = () => ({
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: 'return=representation',
});

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

// Resolve nome canônico e coordenador para um dado nome bruto
function resolverNome(rawNome, CS_TO_COORDINATOR, CS_NOME_LOOKUP) {
    if (!rawNome) return null;
    const lower = rawNome.toLowerCase().trim();
    if (CS_TO_COORDINATOR[lower]) {
        return {
            nome: CS_NOME_LOOKUP[lower] || rawNome,
            coordenador: CS_TO_COORDINATOR[lower],
        };
    }
    // Match parcial: algum alias contido no rawNome ou vice-versa
    const sorted = Object.keys(CS_TO_COORDINATOR).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (lower.includes(key) || key.includes(lower)) {
            return {
                nome: CS_NOME_LOOKUP[key] || rawNome,
                coordenador: CS_TO_COORDINATOR[key],
            };
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

        // 1. Busca todos os registros
        let page = 0;
        const pageSize = 1000;
        let allRecords = [];
        while (true) {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/cs_reunioes?select=id,analista_nome,coordenador&order=id.asc&limit=${pageSize}&offset=${page * pageSize}`,
                { headers: H() }
            );
            if (!r.ok) throw new Error('Erro ao buscar registros: ' + await r.text());
            const rows = await r.json();
            if (!rows.length) break;
            allRecords = allRecords.concat(rows);
            if (rows.length < pageSize) break;
            page++;
        }

        // 2. Determina quais registros precisam de correção
        const toUpdate = [];
        for (const rec of allRecords) {
            const resolved = resolverNome(rec.analista_nome, CS_TO_COORDINATOR, CS_NOME_LOOKUP);
            if (!resolved) continue;
            const nomeOk  = rec.analista_nome === resolved.nome;
            const coordOk = rec.coordenador   === resolved.coordenador;
            if (!nomeOk || !coordOk) {
                toUpdate.push({ id: rec.id, analista_nome: resolved.nome, coordenador: resolved.coordenador });
            }
        }

        if (!toUpdate.length) {
            return res.status(200).json({ ok: true, total: allRecords.length, updated: 0, message: 'Nenhum registro precisou de correção.' });
        }

        // 3. Atualiza em lotes de 100
        const batchSize = 100;
        let updatedCount = 0;
        for (let i = 0; i < toUpdate.length; i += batchSize) {
            const batch = toUpdate.slice(i, i + batchSize);
            const idList = batch.map(r => r.id).join(',');

            // Agrupa por (analista_nome, coordenador) para minimizar chamadas
            const grupos = {};
            for (const r of batch) {
                const key = `${r.analista_nome}||${r.coordenador}`;
                if (!grupos[key]) grupos[key] = { analista_nome: r.analista_nome, coordenador: r.coordenador, ids: [] };
                grupos[key].ids.push(r.id);
            }

            for (const g of Object.values(grupos)) {
                const ids = g.ids.join(',');
                const patchUrl = `${SUPABASE_URL}/rest/v1/cs_reunioes?id=in.(${ids})`;
                const r = await fetch(patchUrl, {
                    method: 'PATCH',
                    headers: H(),
                    body: JSON.stringify({ analista_nome: g.analista_nome, coordenador: g.coordenador }),
                });
                const txt = await r.text();
                if (!r.ok) {
                    console.error(`Erro ao atualizar IDs ${ids}:`, txt);
                    continue;
                }
                const updated = txt ? JSON.parse(txt) : [];
                updatedCount += Array.isArray(updated) ? updated.length : g.ids.length;
            }
        }

        console.log(`migrate/normalize_names: ${updatedCount}/${allRecords.length} registros corrigidos por ${session.email}`);
        return res.status(200).json({
            ok: true,
            total: allRecords.length,
            updated: updatedCount,
            message: `${updatedCount} registro(s) corrigido(s) de ${allRecords.length} total.`,
        });

    } catch (err) {
        console.error('migrate error:', err);
        return res.status(500).json({ error: err.message });
    }
}
