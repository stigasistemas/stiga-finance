// api/stiga-ia.js — Proxy Vercel para Claude API
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        // Parsear body manualmente se necessário
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        if (!body) {
            // Ler stream manualmente
            body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(e); }
                });
                req.on('error', reject);
            });
        }

        const { system, messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Campo messages é obrigatório e deve ser array' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: system || 'Você é a Stiga IA, assistente financeira do app Stiga Finance.',
                messages: messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro Anthropic:', JSON.stringify(data));
            return res.status(response.status).json({ error: data });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error('Erro interno:', err.message);
        return res.status(500).json({ error: err.message });
    }
};
