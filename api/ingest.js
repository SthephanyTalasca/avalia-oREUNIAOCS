// api/ingest.js — CS Auditor
// POST /api/ingest → recebe do Apps Script (com analise já pronta) e salva no Supabase
// GET  /api/ingest → não faz mais nada (cron pode ser desativado)
//
// ⚡ Gemini foi movido para o Apps Script — sem timeout no Vercel
// ⚡ Usa SUPABASE_SERVICE_KEY para bypassar RLS no INSERT

import { getConfig } from './config.js';

export const maxDuration = 30;
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const INGEST_SECRET   = process.env.INGEST_SECRET || 'nibo_cs_2026_drive';

const ALL_PILLARS = [
    'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
    'rapport','autoridade','postura','gestao_tempo','contextualizacao',
    'clareza','objetividade','flexibilidade','dominio_produto','dominio_negocio',
    'ecossistema_nibo','universo_contabil',
];

async function jaExisteNoBanco(driveFileId) {
    if (!driveFileId) return false;
    const r = await fetch(
        `${SUPABASE_URL}/rest/v1/cs_reunioes?drive_file_id=eq.${driveFileId}&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
}

// Resolve coordenador e nome canônico a partir do cs_membros via getConfig()
async function resolverAnalista(rawNome) {
    if (!rawNome) return { nome: rawNome, coordenador: null };
    try {
        const { CS_TO_COORDINATOR, CS_NOME_LOOKUP } = await getConfig();
        const lower = rawNome.toLowerCase().trim();
        // Tenta match exato primeiro
        if (CS_TO_COORDINATOR[lower]) {
            return {
                nome: CS_NOME_LOOKUP[lower] || rawNome,
                coordenador: CS_TO_COORDINATOR[lower],
            };
        }
        // Tenta match parcial (nome dentro do rawNome ou vice-versa)
        const sorted = Object.keys(CS_TO_COORDINATOR).sort((a, b) => b.length - a.length);
        for (const key of sorted) {
            if (lower.includes(key) || key.includes(lower)) {
                return {
                    nome: CS_NOME_LOOKUP[key] || rawNome,
                    coordenador: CS_TO_COORDINATOR[key],
                };
            }
        }
    } catch (e) {
        console.error('resolverAnalista falhou:', e.message);
    }
    return { nome: rawNome, coordenador: null };
}

export default async function handler(req, res) {

    // GET — cron legado, apenas responde OK
    if (req.method === 'GET') {
        const secret = req.query?.secret;
        if (secret !== INGEST_SECRET) return res.status(401).json({ error: 'Nao autorizado.' });
        return res.status(200).json({ ok: true, message: 'Processamento agora feito no Apps Script.' });
    }

    // POST — recebe analise pronta do Apps Script
    if (req.method === 'POST') {
        const secret = req.headers['x-ingest-secret'] || req.body?.secret;
        if (secret !== INGEST_SECRET) return res.status(401).json({ error: 'Nao autorizado.' });

        const body          = req.body || {};
        const analise       = body.analise;
        const folder_name   = body.folder_name;
        const file_name     = body.file_name;
        const drive_file_id = body.drive_file_id;
        const file_url      = body.file_url;

        // Checa duplicata
        try {
            if (drive_file_id && await jaExisteNoBanco(drive_file_id)) {
                return res.status(200).json({ skipped: true, drive_file_id });
            }
        } catch (e) {
            console.error('Erro ao checar duplicata:', e.message);
        }

        const rawNome = analise?.analista_nome || (folder_name || 'Nao identificado').trim();
        const { nome: analistaNome, coordenador } = await resolverAnalista(rawNome);

        const notasCols = {};
        ALL_PILLARS.forEach(p => {
            notasCols['nota_' + p] = analise?.['nota_' + p] ?? null;
        });

        const row = {
            status:                  'concluido',
            analista_nome:           analistaNome,
            coordenador:             coordenador ?? null,
            drive_file_id:           drive_file_id || null,
            file_url:                file_url      || null,
            nome_cliente:            analise?.nome_cliente       || 'Nao identificado',
            data_reuniao:            analise?.data_reuniao       || null,
            media_final:             analise?.media_final        ?? null,
            saude_cliente:           analise?.saude_cliente      || null,
            risco_churn:             analise?.risco_churn        || null,
            tempo_fala_cs:           analise?.tempo_fala_cs      || null,
            tempo_fala_cliente:      analise?.tempo_fala_cliente || null,
            resumo_executivo:        analise?.resumo_executivo   || null,
            sistemas_citados:        analise?.sistemas_citados   || [],
            pontos_fortes:           analise?.pontos_fortes      || [],
            pontos_atencao:          analise?.pontos_atencao     || [],
            justificativa_detalhada: null,
            ck_prazo:                analise?.ck_prazo           || false,
            ck_dever_casa:           analise?.ck_dever_casa      || false,
            ck_certificado:          analise?.ck_certificado     || false,
            ck_proximo_passo:        analise?.ck_proximo_passo   || false,
            ck_dor_vendas:           analise?.ck_dor_vendas      || false,
            ck_suporte:              analise?.ck_suporte         || false,
            ...notasCols,
            analise_json: { ...analise, file_name: file_name || null },
        };

        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_reunioes`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey:         SUPABASE_KEY,
                    Authorization:  `Bearer ${SUPABASE_KEY}`,
                    Prefer:         'return=representation',
                },
                body: JSON.stringify(row),
            });

            if (!r.ok) throw new Error('Supabase: ' + await r.text());
            const saved = await r.json();
            const id    = saved[0]?.id;

            console.log(`Salvo ID ${id} | Analista: ${analistaNome} | Média: ${analise?.media_final}`);
            return res.status(200).json({
                ok:           true,
                id,
                analista:     analistaNome,
                media_final:  analise?.media_final,
                nome_cliente: analise?.nome_cliente,
            });

        } catch (err) {
            console.error('Erro ao salvar:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Metodo nao permitido.' });
}
