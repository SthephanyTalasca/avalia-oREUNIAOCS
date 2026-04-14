// api/save.js
import { db, FieldValue } from '../lib/firebase.js';

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

    // ── Rota: feedback (era feedback.js) ────────────────────────────────────
    if (req.query._route === 'feedback') {
        const { tipo_original, item } = req.body || {};
        if (!tipo_original || (!item?.descricao && !item?.expectativa))
            return res.status(400).json({ error: 'tipo_original e item obrigatórios' });
        await db.collection('cs_feedbacks').add({
            tipo_original,
            descricao: item.descricao || item.expectativa || '',
            item,
            created_at: FieldValue.serverTimestamp(),
        });
        return res.status(200).json({ ok: true });
    }

    const { analise, coordenador } = req.body;
    if (!analise) return res.status(400).json({ error: 'Análise obrigatória' });

    try {
        const row = {
            // ── identificação ──────────────────────────────────────────
            analista_nome:    analise.analista_nome || 'Não identificado',
            coordenador:      coordenador           || null,
            drive_file_id:    analise.drive_file_id || null,
            file_url:         analise.file_url      || null,
            data_reuniao:     analise.data_reuniao  || null,
            nome_cliente:     analise.nome_cliente  || null,

            // ── resumo e meta ──────────────────────────────────────────
            media_final:             analise.media_final         ?? null,
            saude_cliente:           analise.saude_cliente       || null,
            risco_churn:             analise.risco_churn         || null,
            tempo_fala_cs:           analise.tempo_fala_cs       || null,
            tempo_fala_cliente:      analise.tempo_fala_cliente  || null,
            resumo_executivo:        analise.resumo_executivo    || null,
            sistemas_citados:        analise.sistemas_citados    || null,
            pontos_fortes:           analise.pontos_fortes       || null,
            pontos_atencao:          analise.pontos_atencao      || null,
            justificativa_detalhada: analise.justificativa_detalhada || null,

            // ── checklist ─────────────────────────────────────────────
            ck_prazo:         analise.checklist_cs?.definiu_prazo_implementacao || false,
            ck_dever_casa:    analise.checklist_cs?.alinhou_dever_de_casa       || false,
            ck_certificado:   analise.checklist_cs?.validou_certificado_digital  || false,
            ck_proximo_passo: analise.checklist_cs?.agendou_proximo_passo        || false,
            ck_dor_vendas:    analise.checklist_cs?.conectou_com_dor_vendas      || false,
            ck_suporte:       analise.checklist_cs?.explicou_canal_suporte        || false,

            // ── notas dos 17 pilares ───────────────────────────────────
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

            // ── Produto e Melhorias ────────────────────────────────────
            produto_reuniao:  analise.produto_reuniao  || null,
            tem_melhorias:    analise.tem_melhorias    || false,
            problema_produto: analise.problema_produto || false,

            // ── Desalinhamentos de venda ───────────────────────────────
            tem_desalinhamento: analise.tem_desalinhamento || false,

            // ── JSON completo (backup) ─────────────────────────────────
            analise_json: analise,
            created_at:   FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('cs_reunioes').add(row);
        return res.status(200).json({ ok: true, id: docRef.id });

    } catch (e) {
        console.error('Firebase error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
