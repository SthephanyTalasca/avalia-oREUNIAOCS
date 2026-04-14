// api/dashboard.js — CS Auditor
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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    const { coordenador, analista, periodo, data_inicio, data_fim, origem } = req.query;

    try {
        let query = db.collection('cs_reunioes');
        if (coordenador && coordenador !== 'todos') {
            query = query.where('coordenador', '==', coordenador);
        }

        const snap = await query.get();
        let reunioes = docsToArray(snap);

        // Filtros aplicados em JS (Firestore não suporta ilike nem queries em JSON aninhado)
        if (analista && analista !== 'todos') {
            const q = analista.split(' ')[0].toLowerCase();
            reunioes = reunioes.filter(r => (r.analista_nome || '').toLowerCase().includes(q));
        }

        if (periodo && periodo !== 'todos' && !data_inicio) {
            const since = new Date(Date.now() - parseInt(periodo) * 86400000);
            reunioes = reunioes.filter(r => {
                if (r.data_reuniao) return new Date(r.data_reuniao) >= since;
                if (r.created_at)   return new Date(r.created_at)   >= since;
                return false;
            });
        }

        if (data_inicio) {
            const from = new Date(data_inicio);
            reunioes = reunioes.filter(r => r.created_at && new Date(r.created_at) >= from);
        }

        if (data_fim) {
            const to = new Date(data_fim); to.setHours(23, 59, 59, 999);
            reunioes = reunioes.filter(r => r.created_at && new Date(r.created_at) <= to);
        }

        if (origem === 'auto') {
            reunioes = reunioes.filter(r => r.analise_json?.origem === 'drive_automatico');
        } else if (origem === 'manual') {
            reunioes = reunioes.filter(r => !r.analise_json?.origem || r.analise_json.origem !== 'drive_automatico');
        }

        // Ordena por created_at desc
        reunioes.sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
        });

        if (!reunioes.length) return res.status(200).json({ reunioes: [], stats: null });
        return res.status(200).json({ reunioes, stats: calcStats(reunioes) });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const PILLARS = [
    'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
    'rapport','autoridade','postura','gestao_tempo','contextualizacao',
    'clareza','objetividade','flexibilidade','dominio_produto','dominio_negocio',
    'ecossistema_nibo','universo_contabil'
];

function avg(arr) {
    const valid = arr.filter(v => v != null && v > 0 && v <= 5);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function calcStats(reunioes) {
    const total  = reunioes.length;
    const medias = reunioes.filter(r => !r.problema_produto).map(r => r.media_final).filter(v => v != null && v > 0);

    // ── Por coordenador ──────────────────────────────────────────────────
    const porCoordenador = {};
    for (const r of reunioes) {
        if (!porCoordenador[r.coordenador])
            porCoordenador[r.coordenador] = { total:0, medias:[], _alto:0 };
        const c = porCoordenador[r.coordenador];
        c.total++;
        if (r.media_final && r.media_final > 0 && !r.problema_produto) c.medias.push(r.media_final);
        if ((r.risco_churn || '').toLowerCase().includes('alto') ||
            (r.risco_churn || '').toLowerCase().includes('crítico')) c.churn_alto++;
    }
    for (const k of Object.keys(porCoordenador)) {
        porCoordenador[k].media = +avg(porCoordenador[k].medias).toFixed(1);
    }

    // ── Ranking analistas ────────────────────────────────────────────────
    const porAnalista = {};
    for (const r of reunioes) {
        if (!porAnalista[r.analista_nome])
            porAnalista[r.analista_nome] = { nome: r.analista_nome, coordenador: r.coordenador, total:0, medias:{} };
        const a = porAnalista[r.analista_nome];
        a.total++;
        if (r.media_final && r.media_final > 0 && !r.problema_produto) {
            a.medias._all = a.medias._all || [];
            a.medias._all.push(r.media_final);
        }
        if (!r.problema_produto) {
            PILLARS.forEach(p => {
                const val = r['nota_' + p];
                if (val != null && val > 0) {
                    a.medias[p] = a.medias[p] || [];
                    a.medias[p].push(val);
                }
            });
        }
    }
    const ranking = Object.values(porAnalista).map(a => {
        const res = { ...a, media: +avg(a.medias._all || []).toFixed(1) };
        PILLARS.forEach(p => { res['avg_' + p] = +avg(a.medias[p] || []).toFixed(1); });
        delete res.medias;
        return res;
    }).sort((a, b) => b.media - a.media);

    // ── Médias por pilar ─────────────────────────────────────────────────
    const pilaresTime = {};
    PILLARS.forEach(p => {
        const vals = reunioes.filter(r => !r.problema_produto).map(r => r['nota_' + p]).filter(v => v != null && v > 0);
        pilaresTime[p] = +avg(vals).toFixed(1);
    });

    // ── Evolução semanal ─────────────────────────────────────────────────
    const porSemana = {};
    for (const r of reunioes) {
        const d = new Date(r.data_reuniao || r.created_at);
        const mon = new Date(d); mon.setDate(d.getDate() - d.getDay());
        const key = mon.toISOString().split('T')[0];
        if (!porSemana[key]) porSemana[key] = { semana:key, medias:[], total:0 };
        porSemana[key].total++;
        if (r.media_final && r.media_final > 0 && !r.problema_produto) porSemana[key].medias.push(r.media_final);
    }
    const evolucao = Object.values(porSemana)
        .map(s => ({ semana:s.semana, media: +avg(s.medias).toFixed(1), total:s.total }))
        .sort((a, b) => a.semana.localeCompare(b.semana));

    // ── Saúde do Cliente ─────────────────────────────────────────────────
    const saudeStats = { saudavel: 0, risco: 0, critico: 0, indefinido: 0 };
    for (const r of reunioes) {
        const v = (r.saude_cliente || '').toLowerCase();
        if (v.includes('saudável') || v.includes('saudavel') || v.includes('boa') || v.includes('positiv') || v.includes('estável') || v.includes('estavel'))
            saudeStats.saudavel++;
        else if (v.includes('risco') || v.includes('atenção') || v.includes('atencao') || v.includes('moderado') || v.includes('médio') || v.includes('medio'))
            saudeStats.risco++;
        else if (v.includes('crítico') || v.includes('critico') || v.includes('grave') || v.includes('alto') || v.includes('ruim') || v.includes('negativ'))
            saudeStats.critico++;
        else
            saudeStats.indefinido++;
    }

    // ── Risco de Churn ───────────────────────────────────────────────────
    const churnStats = { alto: 0, medio: 0, baixo: 0, indefinido: 0 };
    for (const r of reunioes) {
        const v = (r.risco_churn || '').toLowerCase();
        const temNegacao = /\bnão\b|\bnao\b|\bsem\b|\bnenhum/.test(v);
        if (!temNegacao && (/\balto\b/.test(v) || /\bcrítico\b/.test(v) || /\bcritico\b/.test(v)))
            churnStats.alto++;
        else if (/\bmédio\b/.test(v) || /\bmedio\b/.test(v) || /\bmoderando\b/.test(v))
            churnStats.medio++;
        else if (/\bbaixo\b/.test(v))
            churnStats.baixo++;
        else
            churnStats.indefinido++;
    }

    // ── Checklist ────────────────────────────────────────────────────────
    const ckKeys = ['definiu_prazo_implementacao','alinhou_dever_de_casa','validou_certificado_digital',
                    'agendou_proximo_passo','conectou_com_dor_vendas','explicou_canal_suporte'];
    const ckRates = {};
    ckKeys.forEach(k => {
        const vals = reunioes.map(r => (r.analise_json?.checklist_cs?.[k] ? 1 : 0));
        ckRates[k] = +(avg(vals) * 100).toFixed(0);
    });

    // ── Desalinhamentos de Venda ─────────────────────────────────────────
    const desalinStats = { total: 0, com_desalinhamento: 0, alta: 0, media: 0, baixa: 0 };
    const desalinFreq = {};
    const desalinTratamento = { explicou: 0, escalou: 0, registrou: 0, ignorou: 0, nao_identificado: 0 };

    for (const r of reunioes) {
        const items = r.analise_json?.desalinhamentos || [];
        if (items.length > 0) desalinStats.com_desalinhamento++;
        for (const d of items) {
            desalinStats.total++;
            if (d.severidade === 'alta')       desalinStats.alta++;
            else if (d.severidade === 'media') desalinStats.media++;
            else if (d.severidade === 'baixa') desalinStats.baixa++;

            const key = (d.expectativa || '').slice(0, 60).trim();
            if (key) desalinFreq[key] = (desalinFreq[key] || 0) + 1;

            const ct = d.como_tratado || 'nao_identificado';
            if (ct in desalinTratamento) desalinTratamento[ct]++;
        }
    }

    desalinStats.topExpectativas = Object.entries(desalinFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([expectativa, count]) => ({ expectativa, count }));

    desalinStats.tratamento = desalinTratamento;

    return {
        total,
        media_geral: +avg(medias).toFixed(1),
        porCoordenador,
        ranking,
        pilaresTime,
        evolucao,
        churnStats,
        saudeStats,
        ckRates,
        desalinStats,
    };
}
