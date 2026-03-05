import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: {
        bodyParser: { sizeLimit: '20mb' }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PILLAR_KEYS = [
    ['consultividade',   'Consultividade'],
    ['escuta_ativa',     'Escuta Ativa'],
    ['jornada_cliente',  'Jornada do Cliente'],
    ['encantamento',     'Encantamento'],
    ['objecoes',         'Objeções/Bugs'],
    ['rapport',          'Rapport'],
    ['autoridade',       'Autoridade'],
    ['postura',          'Postura'],
    ['gestao_tempo',     'Gestão de Tempo'],
    ['contextualizacao', 'Contextualização'],
    ['clareza',          'Clareza'],
    ['objetividade',     'Objetividade'],
    ['flexibilidade',    'Flexibilidade'],
    ['dominio_produto',  'Domínio de Produto'],
    ['dominio_negocio',  'Domínio de Negócio'],
    ['ecossistema_nibo', 'Ecossistema Nibo'],
    ['universo_contabil','Universo Contábil'],
];

// ─── CHAMADA 1: apenas números e booleanos (JSON tamanho fixo, nunca trunca) ──
async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction: [
                'Você é auditor de CS do Nibo.',
                'Leia a transcrição e retorne APENAS números e booleanos.',
                'Para cada pilar, retorne nota 1-5.',
                'Se não houver evidência observável do pilar, retorne -1.',
                'media_final = média apenas das notas que NÃO sejam -1.',
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0 a 100.',
            ].join(' '),
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:            { type: Type.NUMBER },
                    tempo_fala_cs_pct:      { type: Type.NUMBER },
                    tempo_fala_cliente_pct: { type: Type.NUMBER },
                    nota_consultividade:    { type: Type.NUMBER },
                    nota_escuta_ativa:      { type: Type.NUMBER },
                    nota_jornada_cliente:   { type: Type.NUMBER },
                    nota_encantamento:      { type: Type.NUMBER },
                    nota_objecoes:          { type: Type.NUMBER },
                    nota_rapport:           { type: Type.NUMBER },
                    nota_autoridade:        { type: Type.NUMBER },
                    nota_postura:           { type: Type.NUMBER },
                    nota_gestao_tempo:      { type: Type.NUMBER },
                    nota_contextualizacao:  { type: Type.NUMBER },
                    nota_clareza:           { type: Type.NUMBER },
                    nota_objetividade:      { type: Type.NUMBER },
                    nota_flexibilidade:     { type: Type.NUMBER },
                    nota_dominio_produto:   { type: Type.NUMBER },
                    nota_dominio_negocio:   { type: Type.NUMBER },
                    nota_ecossistema_nibo:  { type: Type.NUMBER },
                    nota_universo_contabil: { type: Type.NUMBER },
                    ck_prazo:               { type: Type.BOOLEAN },
                    ck_dever_casa:          { type: Type.BOOLEAN },
                    ck_certificado:         { type: Type.BOOLEAN },
                    ck_proximo_passo:       { type: Type.BOOLEAN },
                    ck_dor_vendas:          { type: Type.BOOLEAN },
                    ck_suporte:             { type: Type.BOOLEAN },
                },
                required: [
                    'media_final', 'tempo_fala_cs_pct', 'tempo_fala_cliente_pct',
                    'nota_consultividade', 'nota_escuta_ativa', 'nota_jornada_cliente',
                    'nota_encantamento', 'nota_objecoes', 'nota_rapport', 'nota_autoridade',
                    'nota_postura', 'nota_gestao_tempo', 'nota_contextualizacao', 'nota_clareza',
                    'nota_objetividade', 'nota_flexibilidade', 'nota_dominio_produto',
                    'nota_dominio_negocio', 'nota_ecossistema_nibo', 'nota_universo_contabil',
                    'ck_prazo', 'ck_dever_casa', 'ck_certificado',
                    'ck_proximo_passo', 'ck_dor_vendas', 'ck_suporte',
                ],
            },
        },
    });

    let parsed;
    try {
        parsed = JSON.parse(res.text);
    } catch (e) {
        console.error('getNumbers JSON truncado:', res.text && res.text.slice(-120));
        throw new Error('TRUNCATED_NUMBERS');
    }

    // -1 vira null (sem evidência)
    PILLAR_KEYS.forEach(function(pair) {
        const k = pair[0];
        if (parsed['nota_' + k] === -1) parsed['nota_' + k] = null;
    });

    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';

    parsed.checklist_cs = {
        definiu_prazo_implementacao:  parsed.ck_prazo         || false,
        alinhou_dever_de_casa:        parsed.ck_dever_casa    || false,
        validou_certificado_digital:  parsed.ck_certificado   || false,
        agendou_proximo_passo:        parsed.ck_proximo_passo || false,
        conectou_com_dor_vendas:      parsed.ck_dor_vendas    || false,
        explicou_canal_suporte:       parsed.ck_suporte       || false,
    };

    return parsed;
}

// ─── CHAMADA 2A: justificativas curtas (texto livre com separadores simples) ──
async function getJustificativas(transcript, numbers) {
    const comNota = PILLAR_KEYS.filter(function(pair) {
        return numbers['nota_' + pair[0]] !== null;
    });

    const notasBloco = comNota.map(function(pair) {
        return pair[1] + ': ' + numbers['nota_' + pair[0]] + '/5';
    }).join(', ');

    const pillarLines = comNota.map(function(pair) {
        return '###' + pair[0].toUpperCase() + '### Porque (1 frase): ... | Melhoria (1 frase): ...';
    }).join('\n');

    const instruction = 'Auditor de CS do Nibo. Notas calculadas: ' + notasBloco + '.\n\n'
        + 'Produza exatamente os campos abaixo, cada um em UMA linha, sem texto extra:\n\n'
        + '###RESUMO### (1 frase resumindo a reunião)\n'
        + '###SAUDE### (1 frase sobre saúde do cliente)\n'
        + '###CHURN### (1 frase sobre risco de churn)\n'
        + '###SISTEMAS### (sistemas citados separados por vírgula, ou: nenhum)\n'
        + '###FORTES### (até 4 pontos fortes, um por linha, começando com -)\n'
        + '###ATENCAO### (até 4 pontos de atenção, um por linha, começando com -)\n\n'
        + pillarLines + '\n\nSeja MUITO CONCISO.';

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: instruction,
        },
    });

    const raw = res.text || '';

    function getLine(tag) {
        const idx = raw.indexOf('###' + tag + '###');
        if (idx === -1) return '';
        const after = raw.slice(idx + tag.length + 6);
        const end = after.indexOf('\n');
        return (end === -1 ? after : after.slice(0, end)).trim();
    }

    function getBlock(tag) {
        const idx = raw.indexOf('###' + tag + '###');
        if (idx === -1) return '';
        const after = raw.slice(idx + tag.length + 6);
        const next = after.indexOf('###');
        return (next === -1 ? after : after.slice(0, next)).trim();
    }

    const sistemas = getLine('SISTEMAS');
    const result = {
        resumo_executivo: getLine('RESUMO') || 'Reunião de onboarding avaliada.',
        saude_cliente:    getLine('SAUDE')  || 'N/A',
        risco_churn:      getLine('CHURN')  || 'N/A',
        sistemas_citados: (!sistemas || sistemas.toLowerCase() === 'nenhum')
            ? []
            : sistemas.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        pontos_fortes: getBlock('FORTES').split('\n')
            .map(function(s) { return s.replace(/^-\s*/, '').trim(); }).filter(Boolean),
        pontos_atencao: getBlock('ATENCAO').split('\n')
            .map(function(s) { return s.replace(/^-\s*/, '').trim(); }).filter(Boolean),
    };

    PILLAR_KEYS.forEach(function(pair) {
        const k = pair[0];
        if (numbers['nota_' + k] === null) {
            result['porque_' + k]   = 'Sem evidência na transcrição.';
            result['melhoria_' + k] = null;
            return;
        }
        const line = getLine(k.toUpperCase());
        const pqMatch = line.match(/[Pp]orque[^:]*:\s*([^|]+)/);
        const mlMatch = line.match(/[Mm]elhoria[^:]*:\s*(.+)/);
        const pq = pqMatch ? pqMatch[1].trim() : '';
        const ml = mlMatch ? mlMatch[1].trim() : '';
        result['porque_' + k]   = (pq && pq !== '...') ? pq : 'Sem justificativa.';
        result['melhoria_' + k] = (ml && ml !== '...') ? ml : 'Excelência atingida.';
    });

    return result;
}

// ─── CHAMADA 2B: relatório do coordenador (sem transcrição, só notas+textos) ──
async function getRelatorio(numbers, texts) {
    const linhas = PILLAR_KEYS.map(function(pair) {
        const k = pair[0];
        const label = pair[1];
        const nota = numbers['nota_' + k];
        if (nota === null) return null;
        const pq = texts['porque_' + k] || '';
        const ml = texts['melhoria_' + k] || '';
        const sufixo = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + label + '**: ' + nota + '/5 — ' + pq + sufixo;
    }).filter(Boolean).join('\n');

    const conteudo = 'Coordenador de CS do Nibo — escreva feedback sobre seu analista.\n\n'
        + 'NOTAS:\n' + linhas + '\n\n'
        + 'Média: ' + (numbers.media_final || '?') + '/5'
        + ' | Saúde: ' + (texts.saude_cliente || '')
        + ' | Churn: ' + (texts.risco_churn || '') + '\n'
        + 'Fortes: ' + (texts.pontos_fortes || []).join('; ') + '\n'
        + 'Atenção: ' + (texts.pontos_atencao || []).join('; ') + '\n\n'
        + '## O que o analista fez bem\n'
        + '## O que precisa melhorar\n'
        + '## O que falar no 1:1\n'
        + '## Plano de ação individual';

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conteudo,
        config: {
            maxOutputTokens: 4096,
            systemInstruction: [
                'Coordenador sênior de CS do Nibo.',
                'Markdown puro, linguagem direta e humana.',
                '"O que falar no 1:1": frases prontas para usar literalmente.',
                '"Plano de ação": máx 3 prioridades com ação + prazo + métrica.',
                'Só mencione pilares com nota numérica.',
            ].join(' '),
        },
    });

    return res.text || '';
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const prompt = req.body && req.body.prompt;
    if (!prompt) {
        return res.status(400).json({ error: 'Transcrição obrigatória.' });
    }

    try {
        const numbers = await getNumbers(prompt);
        const texts   = await getJustificativas(prompt, numbers);
        const relatorio = await getRelatorio(numbers, texts);

        return res.status(200).json(
            Object.assign({}, numbers, texts, { justificativa_detalhada: relatorio })
        );

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message === 'TRUNCATED_NUMBERS') {
            return res.status(500).json({ error: 'Erro ao calcular notas. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
