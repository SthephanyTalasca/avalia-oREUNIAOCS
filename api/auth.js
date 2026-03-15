// api/auth.js — CS Auditor
export default async function handler(req, res) {
    const { code, error } = req.query;
    if (error) return res.redirect('/?auth_error=acesso_negado');

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

        const emailParts = (user.email || '').toLowerCase().split('@');
        const domain = emailParts.length === 2 ? emailParts[1] : '';
        if (domain !== 'nibo.com.br') {
            return res.redirect(`/?auth_error=dominio_invalido&email=${encodeURIComponent(user.email)}`);
        }

        const session = Buffer.from(JSON.stringify({
            email:   user.email,
            name:    user.name,
            picture: user.picture,
            exp:     Date.now() + 24 * 60 * 60 * 1000
        })).toString('base64');

        res.setHeader('Set-Cookie',
            `nibo_cs_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
        );
        return res.redirect('/');
    } catch (err) {
        console.error('Auth error:', err);
        return res.redirect('/?auth_error=erro_interno');
    }
}
