import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;

export const config = {
    api: {
        bodyParser: { sizeLimit: '20mb' }
    }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── CHAMADA 1: SÓ NÚMEROS E BOOLEANOS — JSON nunca trunca ───────────────────
// Texto = caracteres variáveis que explodem o output. Números/booleanos = tamanho fixo.
async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction: `Você é auditor de CS do Nibo. Leia a transcrição e retorne APENAS números e booleanos.

Para cada pilar, retorne a nota de 1 a 5. Se não houver NENHUMA evidência observável do pilar na transcrição, retorne -1 (significa "sem evidência").

Pilares: consultividade, escuta_ativa, jornada_cliente, encantamento, objecoes, rapport,
autoridade, postura, gestao_tempo, contextualizacao, clareza, objetividade, flexibilidade,
dominio_produto, dominio_negocio, ecossistema_nibo, universo_contabil

media_final = média apenas das notas que NÃO sejam -1.
tempo_fala_cs e tempo_fala_cliente = inteiro de 0 a 100 (percentual).`,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    media_final:               { type: Type.NUMBER },
                    tempo_fala_cs_pct:         { type: Type.NUMBER },
                    tempo_fala_cliente_pct:    { type: Type.NUMBER },

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

                    ck_prazo:         { type: Type.BOOLEAN },
                    ck_dever_casa:    { type: Type.BOOLEAN },
                    ck_certificado:   { type: Type.BOOLEAN },
                    ck_proximo_passo: { type: Type.BOOLEAN },
                    ck_dor_vendas:    { type: Type.BOOLEAN },
                    ck_suporte:       { type: Type.BOOLEAN }
                },
                required: [
                    "media_final","tempo_fala_cs_pct","tempo_fala_cliente_pct",
                    "nota_consultividade","nota_escuta_ativa","nota_jornada_cliente",
                    "nota_encantamento","nota_objecoes","nota_rapport","nota_autoridade",
                    "nota_postura","nota_gestao_tempo","nota_contextualizacao","nota_clareza",
                    "nota_objetividade","nota_flexibilidade","nota_dominio_produto",
                    "nota_dominio_negocio","nota_ecossistema_nibo","nota_universo_contabil",
                    "ck_prazo","ck_dever_casa","ck_certificado","ck_proximo_passo","ck_dor_vendas","ck_suporte"
                ]
            }
        }
    });

    let parsed;
    try {
        parsed = JSON.parse(res.text);
    } catch(e) {
        console.error('Números JSON truncado:', res.text?.slice(-100));
        throw new Error('TRUNCATED_NUMBERS');
    }

    // Converte -1 para null (sem evidência)
    const keys = [
        'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
        'rapport','autoridade','postura','gestao_tempo','contextualizacao','clareza',
        'objetividade','flexibilidade','dominio_produto','dominio_negocio',
        'ecossistema_nibo','universo_contabil'
    ];
    keys.forEach(k => {
        if (parsed[`nota_${k}`] === -1) parsed[`nota_${k}`] = null;
    });

    // Formata percentuais como string
    parsed.tempo_fala_cs      = `${parsed.tempo_fala_cs_pct ?? 50}%`;
    parsed.tempo_fala_cliente = `${parsed.tempo_fala_cliente_pct ?? 50}%`;

    // Reconstrói checklist no formato que o frontend espera
    parsed.checklist_cs = {
        definiu_prazo_implementacao:   parsed.ck_prazo         ?? false,
        alinhou_dever_de_casa:         parsed.ck_dever_casa    ?? false,
        validou_certificado_digital:   parsed.ck_certificado   ?? false,
        agendou_proximo_passo:         parsed.ck_proximo_passo ?? false,
        conectou_com_dor_vendas:       parsed.ck_dor_vendas    ?? false,
        explicou_canal_suporte:        parsed.ck_suporte       ?? false
    };

    return parsed;
}

// ─── CHAMADA 2: SÓ TEXTO LIVRE — sem schema, sem risco de truncar JSON ────────
// Retorna todos os textos descritivos em formato simples que parseamos depois.
async function getTexts(transcript, numbers) {
    const pillarKeys = [
        ['consultividade','Consultividade'],['escuta_ativa','Escuta Ativa'],
        ['jornada_cliente','Jornada do Cliente'],['encantamento','Encantamento'],
        ['objecoes','Objeções/Bugs'],['rapport','Rapport'],['autoridade','Autoridade'],
        ['postura','Postura'],['gestao_tempo','Gestão de Tempo'],
        ['contextualizacao','Contextualização'],['clareza','Clareza'],
        ['objetividade','Objetividade'],['flexibilidade','Flexibilidade'],
        ['dominio_produto','Domínio de Produto'],['dominio_negocio','Domínio de Negócio'],
        ['ecossistema_nibo','Ecossistema Nibo'],['universo_contabil','Universo Contábil']
    ];

    // Monta lista de pilares que têm nota para pedir texto só deles
    const comNota = pillarKeys.filter(([k]) => numbers[`nota_${k}`] !== null);
    const notasBloco = comNota
        .map(([k, label]) => `${label}: ${numbers[`nota_${k}`]}/5`)
        .join(', ');

    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            maxOutputTokens: 6000,
            systemInstruction: `Você é auditor de CS do Nibo. Com base na transcrição e nas notas já calculadas (${notasBloco}), produza o seguinte em texto puro, usando exatamente os separadores indicados:

###RESUMO###
Uma frase resumindo a reunião.

###SAUDE###
Uma frase sobre a saúde do cliente após a reunião.

###CHURN###
Uma frase sobre o principal risco de churn identificado.

###SISTEMAS###
Liste sistemas/ferramentas citados separados por vírgula. Se nenhum, escreva: nenhum

###FORTES###
Liste até 4 pontos fortes do analista, um por linha, começando com "-".

###ATENCAO###
Liste até 4 pontos de atenção, um por linha, começando com "-".

${comNota.map(([k, label]) => `###PILAR_${k.toUpperCase()}###\nPorquê (máx 2 frases): [motivo da nota]\nMelhoria (máx 1 frase): [o que faltou para 5; se nota=5 escreva "Excelência atingida."]`).join('\n\n')}

###RELATORIO###
Escreva um relatório em Markdown para o COORDENADOR de CS sobre a performance do analista, com estas seções:
## O que o analista fez bem
## O que precisa melhorar
## O que falar no 1:1
## Plano de ação individual

Use evidências concretas da transcrição. Linguagem direta como num bom 1:1.`
        }
    });

    return parseTexts(res.text, pillarKeys, numbers);
}

// ─── Parser do texto livre ────────────────────────────────────────────────────
function parseTexts(raw, pillarKeys, numbers) {
    const get = (tag) => {
        const re = new RegExp(`###${tag}###\\s*([\\s\\S]*?)(?=###|$)`, 'i');
        return (raw.match(re)?.[1] ?? '').trim();
    };

    const result = {
        resumo_executivo: get('RESUMO'),
        saude_cliente:    get('SAUDE'),
        risco_churn:      get('CHURN'),
        sistemas_citados: get('SISTEMAS').toLowerCase() === 'nenhum' ? [] :
            get('SISTEMAS').split(',').map(s => s.trim()).filter(Boolean),
        pontos_fortes:  get('FORTES').split('\n').map(s => s.replace(/^-\s*/,'')).filter(Boolean),
        pontos_atencao: get('ATENCAO').split('\n').map(s => s.replace(/^-\s*/,'')).filter(Boolean),
        justificativa_detalhada: get('RELATORIO')
    };

    // Extrai porque/melhoria de cada pilar
    pillarKeys.forEach(([k]) => {
        if (numbers[`nota_${k}`] === null) {
            result[`porque_${k}`]   = 'Sem evidência na transcrição.';
            result[`melhoria_${k}`] = null;
            return;
        }
        const bloco = get(`PILAR_${k.toUpperCase()}`);
        const porqueMatch   = bloco.match(/[Pp]orqu[êe][^:]*:\s*(.+?)(?:\n|$)/);
        const melhoriaMatch = bloco.match(/[Mm]elhoria[^:]*:\s*(.+?)(?:\n|$)/);
        result[`porque_${k}`]   = porqueMatch?.[1]?.trim()   || 'Sem justificativa.';
        result[`melhoria_${k}`] = melhoriaMatch?.[1]?.trim() || 'Excelência atingida.';
    });

    return result;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Transcrição obrigatória.' });
    }

    try {
        // Chamada 1: só números (JSON pequeno, nunca trunca)
        const numbers = await getNumbers(prompt);

        // Chamada 2: todos os textos em texto livre (sem schema, sem risco)
        const texts = await getTexts(prompt, numbers);

        return res.status(200).json({ ...numbers, ...texts });

    } catch (error) {
        console.error('Erro na API:', error);
        if (error.message === 'TRUNCATED_NUMBERS') {
            return res.status(500).json({ error: 'Erro interno ao calcular notas. Tente novamente.' });
        }
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
