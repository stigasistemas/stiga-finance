// api/stiga-ia.js — Proxy Vercel para Groq API
// CORS restrito aos domínios oficiais do Stiga Finance

const ALLOWED_ORIGINS = [
    'https://stigasistemas.github.io',
    'https://stiga-finance.vercel.app'
];

module.exports = async (req, res) => {
    const origin = req.headers.origin || '';

    // ── Verificar se a origem é permitida ──
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        // Origem não autorizada — bloquear
        return res.status(403).json({ error: 'Origem não autorizada' });
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    // ── Verificar se a chave Groq está configurada ──
    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'Serviço de IA não configurado' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);
        if (!body) {
            body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
                req.on('error', reject);
            });
        }

        const { system, messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Campo messages é obrigatório' });
        }

        // ── Limitar tamanho da requisição (anti-abuso) ──
        const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
        if (totalChars > 8000) {
            return res.status(400).json({ error: 'Mensagem muito longa' });
        }

        // Groq usa o mesmo formato da OpenAI
        const groqMessages = [];
        if (system) groqMessages.push({ role: 'system', content: system });
        groqMessages.push(...messages);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 1024,
                messages: groqMessages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erro no serviço de IA' });
        }

        const text = data.choices?.[0]?.message?.content || 'Não consegui processar.';
        return res.status(200).json({
            content: [{ type: 'text', text }]
        });

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
};
