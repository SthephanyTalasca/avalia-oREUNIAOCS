// api/dashboard.js — CS Auditor
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

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

    const { coordenador, analista, periodo, data_inicio, data_fim } = req.query;

    try {
        let filter = '';
        if (coordenador && coordenador !== 'todos')
            filter += `&coordenador=eq.${encodeURIComponent(coordenador)}`;
        if (analista && analista !== 'todos')
            filter += `&analista_nome=ilike.*${encodeURIComponent(analista.split(' ')[0])}*`;
        if (periodo && periodo !== 'todos' && !data_inicio) {
            const since = new Date(Date.now() - parseInt(periodo) * 86400000).toISOString();
            // Usa data_reuniao se existir, senão created_at
            filter += `&or=(data_reuniao.gte.${since.slice(0,10)},and(data_reuniao.is.null,created_at.gte.${since}))`;
        }
        if (data_inicio) filter += `&created_at=gte.${new Date(data_inicio).toISOString()}`;
        if (data_fim) {
            const fim = new Date(data_fim); fim.setHours(23, 59, 59, 999);
            filter += `&created_at=lte.${fim.toISOString()}`;
        }

        const url = `${SUPABASE_URL}/rest/v1/cs_reunioes?select=*&order=created_at.desc${filter}`;
        const response = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (!response.ok) return res.status(500).json({ error: 'Erro ao buscar dados: ' + await response.text() });

        const reunioes = await response.json();
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

// Média ignorando 0, -1 e null
function avg(arr) {
    const valid = arr.filter(v => v != null && v > 0 && v <= 5);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function calcStats(reunioes) {
    const total  = reunioes.length;
    // Usa media_final do banco, mas ignora 0
    const medias = reunioes.map(r => r.media_final).filter(v => v != null && v > 0);

    // ── Por coordenador ──────────────────────────────────────────────────
    const porCoordenador = {};
    for (const r of reunioes) {
        if (!porCoordenador[r.coordenador])
            porCoordenador[r.coordenador] = { total:0, medias:[], _alto:0 };
        const c = porCoordenador[r.coordenador];
        c.total++;
        if (r.media_final && r.media_final > 0) c.medias.push(r.media_final);
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
        if (r.media_final && r.media_final > 0) {
            a.medias._all = a.medias._all || [];
            a.medias._all.push(r.media_final);
        }
        PILLARS.forEach(p => {
            const val = r['nota_' + p];
            if (val != null && val > 0) {
                a.medias[p] = a.medias[p] || [];
                a.medias[p].push(val);
            }
        });
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
        const vals = reunioes.map(r => r['nota_' + p]).filter(v => v != null && v > 0);
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
        if (r.media_final && r.media_final > 0) porSemana[key].medias.push(r.media_final);
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

    return {
        total,
        media_geral: +avg(medias).toFixed(1),
        porCoordenador,
        ranking,
        pilaresTime,
        evolucao,
        churnStats,
        saudeStats,
        ckRates
    };
}
