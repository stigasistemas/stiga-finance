// ================================================================
// STIGA FINANCE — WEBHOOK KIWIFY (CORRIGIDO)
// Função serverless que roda na Vercel
// ================================================================

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Inicializar Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const auth = admin.auth();
const db = admin.firestore();

// Configurar email
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// FUNÇÃO PRINCIPAL
module.exports = async (req, res) => {
    console.log('🔔 Webhook recebido:', new Date().toISOString());
    console.log('Method:', req.method);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        if (!payload?.Customer?.email) {
            return res.status(400).json({ error: 'Email ausente' });
        }

        const status = payload.order_status || payload.Order?.status;
        if (status !== 'paid' && status !== 'approved') {
            return res.status(200).json({ message: 'Aguardando pagamento' });
        }

        const email = payload.Customer.email.toLowerCase().trim();
        const name = payload.Customer.full_name || payload.Customer.first_name || 'Cliente';
        const orderId = payload.order_id || Date.now();
        const password = generateStrongPassword();

        console.log('👤 Cliente:', email, '-', name);

        // Criar usuário
        let user;
        try {
            user = await auth.createUser({
                email,
                password,
                displayName: name,
            });
            console.log('✅ Usuário criado:', user.uid);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                user = await auth.getUserByEmail(email);
                await auth.updateUser(user.uid, { password });
                console.log('✅ Senha atualizada:', user.uid);
            } else {
                throw error;
            }
        }

        // Salvar no Firestore
        await db.collection('users').doc(user.uid).set({
            email,
            name,
            orderId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionStatus: 'active',
            plan: 'basic',
        });

        // Enviar email
        await sendWelcomeEmail(email, name, password);
        console.log('✅ Concluído!');

        return res.status(200).json({
            success: true,
            userId: user.uid,
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return res.status(500).json({
            error: error.message,
        });
    }
};

function generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ' + 'abcdefghijkmnopqrstuvwxyz' + '23456789' + '@#$%&*!';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
}

async function sendWelcomeEmail(email, name, password) {
    await transporter.sendMail({
        from: `"Stiga Finance" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 Bem-vindo ao Stiga Finance',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial; background: #0A0E17; color: #E0E0E0; margin: 0; padding: 40px;">
    <div style="max-width: 600px; margin: 0 auto; background: #1a1f2e; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #D4AF37, #B8942A); padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: #0A0E17;">STIGA FINANCE</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #D4AF37;">Olá, ${name}! 👋</h2>
            <p>Seu pagamento foi confirmado!</p>
            <div style="background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
                <p><strong style="color: #F4E5C3;">Email:</strong><br>
                <code style="background: rgba(0,0,0,0.3); padding: 8px; display: inline-block; margin-top: 6px; color: #D4AF37;">${email}</code></p>
                <p style="margin-top: 16px;"><strong style="color: #F4E5C3;">Senha:</strong><br>
                <code style="background: rgba(0,0,0,0.3); padding: 8px; display: inline-block; margin-top: 6px; color: #D4AF37;">${password}</code></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://stigasistemas.github.io/stiga-finance/" style="background: linear-gradient(135deg, #D4AF37, #B8942A); color: #0A0E17; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ACESSAR SISTEMA →</a>
            </div>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 20px; text-align: center; color: #888; font-size: 13px;">
            <p>Dúvidas? <a href="mailto:suporte@stigasistemas.com.br" style="color: #D4AF37;">suporte@stigasistemas.com.br</a></p>
        </div>
    </div>
</body>
</html>
        `,
    });
    console.log('✅ Email enviado para:', email);
}
