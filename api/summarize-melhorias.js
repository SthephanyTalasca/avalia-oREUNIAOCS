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
                `Abaixo estão ${melhorias.length} sugestões de melhoria coletadas em reuniões de onboarding com clientes:\n\n` +
                linhas +
                `\n\nGere um diagnóstico executivo em 3 a 5 frases que sintetize os principais padrões. ` +
                `Mencione os produtos e tipos de problema mais frequentes, cite exemplos concretos onde houver repetição. ` +
                `Seja direto e objetivo. Escreva em português.`,
            config: { maxOutputTokens: 600 },
        });
        return res.status(200).json({ resumo: result.text });
    } catch (e) {
        console.error('summarize-melhorias erro:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
