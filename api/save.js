// api/save.js — CS Auditor
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
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado' });

    const { analise } = req.body;
    if (!analise) return res.status(400).json({ error: 'Análise obrigatória' });

    try {
        const row = {
            analista_nome:       analise.analista_nome       || 'Não identificado',
            media_final:         analise.media_final         || null,
            saude_cliente:       analise.saude_cliente       || null,
            risco_churn:         analise.risco_churn         || null,
            tempo_fala_cs:       analise.tempo_fala_cs       || null,
            tempo_fala_cliente:  analise.tempo_fala_cliente  || null,
            nota_consultividade:    analise.nota_consultividade    || null,
            nota_escuta_ativa:      analise.nota_escuta_ativa      || null,
            nota_jornada_cliente:   analise.nota_jornada_cliente   || null,
            nota_encantamento:      analise.nota_encantamento      || null,
            nota_objecoes:          analise.nota_objecoes          || null,
            nota_rapport:           analise.nota_rapport           || null,
            nota_autoridade:        analise.nota_autoridade        || null,
            nota_postura:           analise.nota_postura           || null,
            nota_gestao_tempo:      analise.nota_gestao_tempo      || null,
            nota_contextualizacao:  analise.nota_contextualizacao  || null,
            nota_clareza:           analise.nota_clareza           || null,
            nota_objetividade:      analise.nota_objetividade      || null,
            nota_flexibilidade:     analise.nota_flexibilidade     || null,
            nota_dominio_produto:   analise.nota_dominio_produto   || null,
            nota_dominio_negocio:   analise.nota_dominio_negocio   || null,
            nota_ecossistema_nibo:  analise.nota_ecossistema_nibo  || null,
            nota_universo_contabil: analise.nota_universo_contabil || null,
            analise_json: analise
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/reunioes_cs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(row)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Supabase error:', err);
            return res.status(500).json({ error: 'Erro ao salvar: ' + err });
        }

        const saved = await response.json();
        return res.status(200).json({ ok: true, id: saved[0]?.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
