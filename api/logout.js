// api/logout.js — CS Auditor
export default function handler(req, res) {
    res.setHeader('Set-Cookie', 'nibo_cs_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
    return res.status(200).json({ ok: true });
}
