// ============================================================
// STIGA IA — Endpoint Vercel (api/stiga-ia.js)
// A chave fica segura em variável de ambiente no Vercel
// ============================================================

const https = require('https');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'API key não configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel.' });
        return;
    }

    try {
        const { system, messages } = req.body;

        const postData = JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: system || '',
            messages: messages || []
        });

        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const apiReq = https.request(options, apiRes => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: data }));
            });

            apiReq.on('error', reject);
            apiReq.write(postData);
            apiReq.end();
        });

        res.status(response.status).send(response.body);

    } catch (err) {
        console.error('Stiga IA erro:', err);
        res.status(500).json({ error: err.message });
    }
};
