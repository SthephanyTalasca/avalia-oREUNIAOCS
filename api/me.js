// api/me.js — CS Auditor
// GET  → retorna dados da sessão do usuário autenticado
// POST → encerra a sessão (logout)
export default function handler(req, res) {
    if (req.method === 'POST') {
        res.setHeader('Set-Cookie', 'nibo_cs_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
        return res.status(200).json({ ok: true });
    }

    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/nibo_cs_session=([^;]+)/);
    if (!match) return res.status(401).json({ error: 'Não autenticado' });
    try {
        const session = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        if (session.exp && Date.now() > session.exp) {
            res.setHeader('Set-Cookie', 'nibo_cs_session=; Max-Age=0; Path=/');
            return res.status(401).json({ error: 'Sessão expirada' });
        }
        const domain = session.email.toLowerCase().split('@')[1];
        if (domain !== 'nibo.com.br') {
            res.setHeader('Set-Cookie', 'nibo_cs_session=; Max-Age=0; Path=/');
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        return res.status(200).json({ email: session.email, name: session.name, picture: session.picture, role: session.role, googleClientId: process.env.GOOGLE_CLIENT_ID || null });
    } catch {
        return res.status(401).json({ error: 'Sessão inválida' });
    }
}
