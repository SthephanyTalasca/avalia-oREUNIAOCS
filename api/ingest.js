// api/ingest.js — salva transcrição como 'pendente' e retorna imediatamente
export const config = {
    api: { bodyParser: { sizeLimit: '20mb' } }
};

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;
const INGEST_SECRET = process.env.INGEST_SECRET || 'nibo_cs_2026_drive';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido.' });
    }

    const secret = req.headers['x-ingest-secret'] || (req.body && req.body.secret);
    if (secret !== INGEST_SECRET) {
        return res.status(401).json({ error: 'Nao autorizado.' });
    }

    const body          = req.body || {};
    const transcript    = body.transcript;
    const folder_name   = body.folder_name;
    const file_name     = body.file_name;
    const data_reuniao  = body.data_reuniao;
    const drive_file_id = body.drive_file_id;
    const file_url      = body.file_url;

    if (!transcript || transcript.trim().length < 50) {
        return res.status(400).json({ error: 'Transcricao ausente ou muito curta.' });
    }

    // Checa duplicata
    if (drive_file_id) {
        try {
            const r = await fetch(
                SUPABASE_URL + '/rest/v1/cs_reunioes?drive_file_id=eq.' + drive_file_id + '&select=id,status',
                { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
            );
            const rows = await r.json();
            if (Array.isArray(rows) && rows.length > 0) {
                return res.status(200).json({
                    skipped: true,
                    drive_file_id: drive_file_id,
                    status: rows[0].status
                });
            }
        } catch (e) {
            console.error('Erro ao checar duplicata:', e.message);
        }
    }

    const analistaNome = (folder_name || 'Nao identificado').trim();

    // Salva como pendente — inclui a transcrição no analise_json para o /api/process usar
    const row = {
        analista_nome:  analistaNome,
        drive_file_id:  drive_file_id || null,
        file_url:       file_url      || null,
        data_reuniao:   data_reuniao  || null,
        status:         'pendente',
        analise_json:   { transcript: transcript, file_name: file_name || null },
    };

    try {
        const r = await fetch(SUPABASE_URL + '/rest/v1/cs_reunioes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey:         SUPABASE_KEY,
                Authorization:  'Bearer ' + SUPABASE_KEY,
                Prefer:         'return=representation',
            },
            body: JSON.stringify(row),
        });

        if (!r.ok) throw new Error('Supabase: ' + await r.text());

        const saved = await r.json();
        const id    = saved[0] && saved[0].id;

        console.log('Enfileirado ID ' + id + ' | Analista: ' + analistaNome);
        return res.status(200).json({ ok: true, id: id, status: 'pendente', analista: analistaNome });

    } catch (err) {
        console.error('Erro ao salvar pendente:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
