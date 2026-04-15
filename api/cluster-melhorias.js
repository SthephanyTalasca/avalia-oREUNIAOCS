import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const { melhorias } = req.body || {};
    if (!melhorias || !melhorias.length) {
        return res.status(400).json({ error: 'Nenhuma melhoria fornecida.' });
    }

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
            config: {
                responseMimeType: 'application/json',
                maxOutputTokens: 4096,
            },
        });

        const data = JSON.parse(result.text);

        const temas = (data.temas || []).map(tema => {
            const items = (tema.indices || [])
                .map(i => melhorias[i - 1])
                .filter(Boolean);
            const clientes = [...new Set(items.map(m => m._cliente).filter(c => c && c !== '—'))];
            const frases = items.map(m => m.frase_cliente).filter(Boolean).slice(0, 3);
            return { tag: tema.tag, descricao: tema.descricao, items, clientes, frases };
        })
        .filter(t => t.items.length > 0)
        .sort((a, b) => b.items.length - a.items.length);

        return res.status(200).json({ temas });
    } catch (e) {
        console.error('cluster-melhorias erro:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
