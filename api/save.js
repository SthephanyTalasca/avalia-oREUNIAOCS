// api/save.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

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

    const { analise, coordenador } = req.body;
    if (!analise) return res.status(400).json({ error: 'Análise obrigatória' });

    try {
        const row = {
            status:                 'concluido',
            coordenador:            coordenador || null,
            nome_cliente:           analise.nome_cliente           || 'Não identificado',
            analista_nome:          analise.analista_nome          || 'Não identificado',
            data_reuniao:           analise.data_reuniao           || null,
            media_final:            analise.media_final            || null,
            saude_cliente:          analise.saude_cliente          || null,
            risco_churn:            analise.risco_churn            || null,
            tempo_fala_cs:          analise.tempo_fala_cs          || null,
            tempo_fala_cliente:     analise.tempo_fala_cliente     || null,
            resumo_executivo:       analise.resumo_executivo       || null,
            sistemas_citados:       analise.sistemas_citados       || [],
            pontos_fortes:          analise.pontos_fortes          || [],
            pontos_atencao:         analise.pontos_atencao         || [],
            justificativa_detalhada: analise.justificativa_detalhada || null,
            ck_prazo:               analise.ck_prazo               || false,
            ck_dever_casa:          analise.ck_dever_casa          || false,
            ck_certificado:         analise.ck_certificado         || false,
            ck_proximo_passo:       analise.ck_proximo_passo       || false,
            ck_dor_vendas:          analise.ck_dor_vendas          || false,
            ck_suporte:             analise.ck_suporte             || false,
            nota_consultividade:    analise.nota_consultividade    ?? null,
            nota_escuta_ativa:      analise.nota_escuta_ativa      ?? null,
            nota_jornada_cliente:   analise.nota_jornada_cliente   ?? null,
            nota_encantamento:      analise.nota_encantamento      ?? null,
            nota_objecoes:          analise.nota_objecoes          ?? null,
            nota_rapport:           analise.nota_rapport           ?? null,
            nota_autoridade:        analise.nota_autoridade        ?? null,
            nota_postura:           analise.nota_postura           ?? null,
            nota_gestao_tempo:      analise.nota_gestao_tempo      ?? null,
            nota_contextualizacao:  analise.nota_contextualizacao  ?? null,
            nota_clareza:           analise.nota_clareza           ?? null,
            nota_objetividade:      analise.nota_objetividade      ?? null,
            nota_flexibilidade:     analise.nota_flexibilidade     ?? null,
            nota_dominio_produto:   analise.nota_dominio_produto   ?? null,
            nota_dominio_negocio:   analise.nota_dominio_negocio   ?? null,
            nota_ecossistema_nibo:  analise.nota_ecossistema_nibo  ?? null,
            nota_universo_contabil: analise.nota_universo_contabil ?? null,
            analise_json: analise,
        };

        const r = await fetch(`${SUPABASE_URL}/rest/v1/cs_reunioes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Prefer: 'return=representation'
            },
            body: JSON.stringify(row)
        });

        if (!r.ok) {
            const err = await r.text();
            console.error('Supabase:', err);
            return res.status(500).json({ error: err });
        }

        const saved = await r.json();
        return res.status(200).json({ ok: true, id: saved[0]?.id });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
