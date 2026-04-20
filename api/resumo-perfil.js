import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const { analista, periodo, mediaGeral, totalAvaliacoes, pilaresDestaque, pilaresAtencao, tendencia, fortes, atencao, resumos } = req.body || {};

    if (!analista || !totalAvaliacoes) return res.status(400).json({ error: 'Dados insuficientes.' });

    const prompt = `Você é um coordenador de Customer Success sênior do Nibo analisando o desempenho de um analista.

Analista: ${analista}
Período analisado: ${periodo}
Total de avaliações: ${totalAvaliacoes}
Média geral: ${mediaGeral}/5

Pilares com melhor desempenho (média ≥ 4.5):
${pilaresDestaque.length ? pilaresDestaque.map(p => `- ${p.label}: ${p.val}`).join('\n') : '- Nenhum'}

Pilares que precisam de atenção (média < 4.0):
${pilaresAtencao.length ? pilaresAtencao.map(p => `- ${p.label}: ${p.val}`).join('\n') : '- Nenhum'}

Tendência de desempenho (primeiras vs últimas avaliações do período):
${tendencia}

Pontos fortes mais citados nas avaliações:
${fortes.length ? fortes.slice(0, 5).map(f => `- ${f}`).join('\n') : '- Sem dados suficientes'}

Pontos de atenção mais citados:
${atencao.length ? atencao.slice(0, 5).map(a => `- ${a}`).join('\n') : '- Sem dados suficientes'}

Resumos de reuniões recentes:
${resumos.length ? resumos.slice(0, 4).map((r, i) => `${i + 1}. ${r}`).join('\n') : '- Sem dados'}

Escreva um parágrafo narrativo de feedback (3 a 5 frases) em português, como se fosse um coordenador falando para o time sobre esse analista.
- Mencione o nome do analista
- Cite os pilares pelo nome quando relevante
- Mencione os períodos se houver tendência clara (ex: "desde março", "nas últimas avaliações")
- Destaque conquistas e padrões positivos
- Aponte áreas de desenvolvimento sem ser pejorativo
- Se houver melhora ou queda visível, mencione isso
- Texto corrido, sem bullet points, direto e humano
- Máximo 5 frases`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { maxOutputTokens: 600 },
        });
        return res.status(200).json({ resumo: result.text });
    } catch (e) {
        console.error('resumo-perfil erro:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
