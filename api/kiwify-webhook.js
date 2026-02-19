const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').split('\\n').join('\n'),
        }),
    });
}

const auth = admin.auth();
const db   = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const payload = req.body;
        console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

        if (!payload.Customer?.email) return res.status(400).json({ error: 'Email ausente' });

        const status = payload.order_status || payload.Order?.status;
        if (status !== 'paid' && status !== 'approved') {
            return res.status(200).json({ message: 'Aguardando pagamento: ' + status });
        }

        const customerEmail = payload.Customer.email.toLowerCase().trim();
        const customerName  = payload.Customer.full_name || payload.Customer.first_name || 'Cliente';
        const orderId       = payload.order_id || Date.now();
        const password      = generateStrongPassword();

        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({ email: customerEmail, password, displayName: customerName });
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                firebaseUser = await auth.getUserByEmail(customerEmail);
                await auth.updateUser(firebaseUser.uid, { password });
            } else throw err;
        }

        await db.collection('users').doc(firebaseUser.uid).set({
            email: customerEmail, name: customerName, orderId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionStatus: 'active', plan: 'basic',
        });

        await sendWelcomeEmail(customerEmail, customerName, password);

        return res.status(200).json({ success: true, userId: firebaseUser.uid });

    } catch (error) {
        console.error('Erro:', error);
        return res.status(500).json({ error: error.message });
    }
};

function generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*!';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
}

async function sendWelcomeEmail(email, name, password) {
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transport.sendMail({
        from: `"Stiga Finance" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Bem-vindo ao Stiga Finance — Suas Credenciais',
        html: `<div style="font-family:sans-serif;background:#0A0E17;color:#eee;padding:40px;border-radius:12px;max-width:500px;margin:auto">
            <h1 style="color:#D4AF37">STIGA FINANCE</h1>
            <h2>Olá, ${name}! 👋</h2>
            <p>Sua conta está ativa. Acesse com as credenciais abaixo:</p>
            <div style="background:rgba(212,175,55,.1);border:1px solid #D4AF37;border-radius:8px;padding:20px;margin:20px 0">
                <p><strong>Email:</strong><br><code style="color:#D4AF37">${email}</code></p>
                <p><strong>Senha:</strong><br><code style="color:#D4AF37">${password}</code></p>
            </div>
            <p style="color:#E74C3C"><strong>⚠️ Guarde essas informações em local seguro!</strong></p>
            <a href="https://stiga-finance.vercel.app" style="display:inline-block;background:#D4AF37;color:#0A0E17;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">ACESSAR O SISTEMA →</a>
        </div>`,
    });
    console.log('Email enviado para:', email);
}