import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const { action, melhorias, produto, analista, periodo, mediaGeral, totalAvaliacoes, pilaresDestaque, pilaresAtencao, tendencia, fortes, atencao, resumos } = req.body || {};

    // ── RESUMO PERFIL ANALISTA ───────────────────────────────────────────────
    if (action === 'resumo_perfil') {
        if (!analista || !totalAvaliacoes) return res.status(400).json({ error: 'Dados insuficientes.' });
        const prompt = `Você é um coordenador de Customer Success sênior do Nibo analisando o desempenho de um analista.\n\nAnalista: ${analista}\nPeríodo analisado: ${periodo}\nTotal de avaliações: ${totalAvaliacoes}\nMédia geral: ${mediaGeral}/5\n\nPilares com melhor desempenho (média ≥ 4.5):\n${pilaresDestaque?.length ? pilaresDestaque.map(p=>`- ${p.label}: ${p.val}`).join('\n') : '- Nenhum'}\n\nPilares que precisam de atenção (média < 4.0):\n${pilaresAtencao?.length ? pilaresAtencao.map(p=>`- ${p.label}: ${p.val}`).join('\n') : '- Nenhum'}\n\nTendência (primeiras vs últimas avaliações):\n${tendencia}\n\nPontos fortes mais citados:\n${fortes?.length ? fortes.slice(0,5).map(f=>`- ${f}`).join('\n') : '- Sem dados'}\n\nPontos de atenção mais citados:\n${atencao?.length ? atencao.slice(0,5).map(a=>`- ${a}`).join('\n') : '- Sem dados'}\n\nResumos de reuniões recentes:\n${resumos?.length ? resumos.slice(0,4).map((r,i)=>`${i+1}. ${r}`).join('\n') : '- Sem dados'}\n\nEscreva um parágrafo narrativo de feedback (3 a 5 frases) em português, como se fosse um coordenador falando sobre esse analista. Mencione o nome, os pilares pelo nome, períodos quando relevante. Destaque conquistas, aponte desenvolvimento sem ser pejorativo. Texto corrido, sem bullet points.`;
        try {
            const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { maxOutputTokens: 600 } });
            return res.status(200).json({ resumo: result.text });
        } catch (e) {
            console.error('melhorias-ai resumo_perfil erro:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

    if (!melhorias || !melhorias.length) {
        return res.status(400).json({ error: 'Nenhuma melhoria fornecida.' });
    }

    // ── RESUMO IA ────────────────────────────────────────────────────────────
    if (action === 'summarize') {
        const contexto = produto ? `focado no produto ${produto}` : `de todos os produtos`;
        const linhas = melhorias.map((m, i) => {
            const partes = [`${i + 1}. [${m.produto || '?'} / ${m.tipo || '?'}] ${m.descricao || '—'}`];
            if (m.frase_cliente) partes.push(`"${m.frase_cliente}"`);
            if (m._cliente && m._cliente !== '—') partes.push(`(cliente: ${m._cliente})`);
            return partes.join(' — ');
        }).join('\n');

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents:
                    `Você é um analista de produto sênior do Nibo. ` +
                    `Abaixo estão ${melhorias.length} sugestões de melhoria ${contexto}, coletadas em reuniões de onboarding com clientes:\n\n` +
                    linhas +
                    `\n\nGere um diagnóstico executivo que sintetize as principais reclamações e pedidos. ` +
                    `Destaque os problemas mais frequentes, cite exemplos concretos onde houver repetição, e indique padrões de impacto. ` +
                    `Seja direto e objetivo. Termine sempre com uma frase completa. Escreva em português.`,
                config: { maxOutputTokens: 8000 },
            });
            return res.status(200).json({ resumo: result.text });
        } catch (e) {
            console.error('melhorias-ai summarize erro:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

    // ── CLUSTER POR TEMA ─────────────────────────────────────────────────────
    if (action === 'cluster') {
        const linhas = melhorias.map((m, i) =>
            `${i + 1}. [${m.produto || '?'}] ${m.descricao || '—'} | cliente: ${m._cliente || '?'}${m.frase_cliente ? ` | "${m.frase_cliente}"` : ''}`
        ).join('\n');

        const prompt =
            `Você é analista de produto Nibo. Abaixo há ${melhorias.length} sugestões de melhoria coletadas em reuniões com clientes:\n\n` +
            linhas +
            `\n\nAgrupe essas sugestões por TEMA (problema ou necessidade em comum), independentemente de como foram descritas. ` +
            `Use entre 3 e 10 temas. Priorize temas com mais de um cliente. ` +
            `Para cada tema retorne:\n` +
            `- tag: nome curto do tema (máximo 4 palavras, ex: "Lentidão do sistema", "Chat interno ausente")\n` +
            `- descricao: o que os clientes estão pedindo/reclamando, em 1 frase\n` +
            `- indices: array com os índices (1-based) das sugestões que pertencem ao tema\n\n` +
            `Retorne SOMENTE JSON no formato: { "temas": [ { "tag": "...", "descricao": "...", "indices": [1, 3] } ] }`;

        try {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
            });

            const data = JSON.parse(result.text);
            const temas = (data.temas || []).map(tema => {
                const items = (tema.indices || []).map(i => melhorias[i - 1]).filter(Boolean);
                const clientes = [...new Set(items.map(m => m._cliente).filter(c => c && c !== '—'))];
                const frases = items.map(m => m.frase_cliente).filter(Boolean).slice(0, 3);
                return { tag: tema.tag, descricao: tema.descricao, items, clientes, frases };
            })
            .filter(t => t.items.length > 0)
            .sort((a, b) => b.items.length - a.items.length);

            return res.status(200).json({ temas });
        } catch (e) {
            console.error('melhorias-ai cluster erro:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(400).json({ error: 'action inválida. Use "summarize" ou "cluster".' });
}
