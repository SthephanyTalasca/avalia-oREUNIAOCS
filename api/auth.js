// api/auth.js — CS Auditor
// Google OAuth via troca de código de autorização
// Qualquer conta @nibo.com.br tem acesso

const ADMIN_EMAILS = [
    'simone.rangel@nibo.com.br',
    'jonathan.dornelas@nibo.com.br',
    'sthephany.talasca@nibo.com.br',
];

export default async function handler(req, res) {
    // ── Rota: session check / logout (era me.js) ────────────────────────────
    if (req.query._route === 'me') {
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
            return res.status(200).json({
                email: session.email, name: session.name,
                picture: session.picture, role: session.role,
                googleClientId: process.env.GOOGLE_CLIENT_ID || null,
            });
        } catch {
            return res.status(401).json({ error: 'Sessão inválida' });
        }
    }

    // ── Rota: OAuth Google ──────────────────────────────────────────────────
    const { code, error } = req.query;

    if (error) {
        return res.redirect('/?auth_error=acesso_negado');
    }

    if (!code) {
        const params = new URLSearchParams({
            client_id:     process.env.GOOGLE_CLIENT_ID,
            redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope:         'openid email profile',
            access_type:   'offline',
            prompt:        'select_account'
        });
        return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id:     process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
                grant_type:    'authorization_code'
            })
        });

        const tokens = await tokenRes.json();
        if (!tokens.access_token) throw new Error('Token inválido');

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const user = await userRes.json();

        const domain = user.email.toLowerCase().split('@')[1];
        if (domain !== 'nibo.com.br') {
            return res.redirect(`/?auth_error=dominio_invalido&email=${encodeURIComponent(user.email)}`);
        }

        const role = ADMIN_EMAILS.includes(user.email.toLowerCase()) ? 'admin' : 'viewer';

        const session = Buffer.from(JSON.stringify({
            email:   user.email,
            name:    user.name,
            picture: user.picture,
            role,
            exp:     Date.now() + 24 * 60 * 60 * 1000
        })).toString('base64');

        // ✅ Cookie correto: nibo_cs_session (igual ao me.js)
        res.setHeader('Set-Cookie',
            `nibo_cs_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
        );

        return res.redirect('/');

    } catch (err) {
        console.error('Auth error:', err);
        return res.redirect('/?auth_error=erro_interno');
    }
}
