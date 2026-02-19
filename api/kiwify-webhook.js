// ================================================================
// STIGA FINANCE — WEBHOOK KIWIFY
// Função serverless que roda na Vercel
// ================================================================

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// ================================================================
// INICIALIZAR FIREBASE
// ================================================================
if (!admin.apps.length) {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').split('\\n').join('\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const auth = admin.auth();
const db   = admin.firestore();

// ================================================================
// HANDLER PRINCIPAL
// ================================================================
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

        if (!payload.Customer || !payload.Customer.email) {
            return res.status(400).json({ error: 'Dados inválidos: Customer.email ausente' });
        }

        const status = payload.order_status || payload.Order?.status;
        if (status !== 'paid' && status !== 'approved') {
            return res.status(200).json({ message: 'Aguardando aprovação do pagamento' });
        }

        const customerEmail = payload.Customer.email.toLowerCase().trim();
        const customerName  = payload.Customer.full_name || payload.Customer.first_name || 'Cliente';
        const orderId       = payload.order_id || payload.Order?.id || Date.now();
        const password      = generateStrongPassword();

        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({
                email:       customerEmail,
                password:    password,
                displayName: customerName,
                disabled:    false,
            });
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                firebaseUser = await auth.getUserByEmail(customerEmail);
                await auth.updateUser(firebaseUser.uid, { password });
            } else {
                throw err;
            }
        }

        await db.collection('users').doc(firebaseUser.uid).set({
            email:              customerEmail,
            name:               customerName,
            orderId:            orderId,
            createdAt:          admin.firestore.FieldValue.serverTimestamp(),
            subscriptionStatus: 'active',
            plan:               'basic',
        });

        await sendWelcomeEmail(customerEmail, customerName, password);

        return res.status(200).json({
            success: true,
            message: 'Usuário criado e e-mail enviado',
            userId:  firebaseUser.uid,
        });

    } catch (error) {
        console.error('Erro no webhook:', error);
        return res.status(500).json({
            error:   'Erro ao processar webhook',
            details: error.message,
        });
    }
};

// ================================================================
// GERAR SENHA FORTE
// ================================================================
function generateStrongPassword() {
    const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower   = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*!';
    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];
    const all = upper + lower + numbers + symbols;
    for (let i = 0; i < 8; i++) pwd += all[Math.floor(Math.random() * all.length)];
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// ================================================================
// ENVIAR E-MAIL
// ================================================================
async function sendWelcomeEmail(email, name, password) {
    // Criar transporter dentro da função para evitar problemas de inicialização
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transport.sendMail({
        from:    `"Stiga Finance" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: 'Bem-vindo ao Stiga Finance — Suas Credenciais de Acesso',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
body{font-family:'Segoe UI',sans-serif;background:#0A0E17;color:#E0E0E0;margin:0;padding:0}
.container{max-width:600px;margin:40px auto;background:linear-gradient(135deg,#1a1f2e,#0f1419);border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,.2)}
.header{background:linear-gradient(135deg,#D4AF37,#B8942A);padding:30px;text-align:center}
.header h1{margin:0;color:#0A0E17;font-size:28px;letter-spacing:2px}
.content{padding:40px 30px}
.content h2{color:#D4AF37;margin-top:0}
.box{background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:12px;padding:24px;margin:24px 0}
.val{background:rgba(0,0,0,.3);padding:10px 14px;border-radius:6px;font-family:monospace;color:#D4AF37;display:inline-block;font-size:15px;margin-top:6px}
.btn{display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0}
.footer{background:rgba(0,0,0,.3);padding:20px;text-align:center;color:#888;font-size:13px}
.alert{background:rgba(231,76,60,.1);border-left:3px solid #E74C3C;padding:14px;margin:20px 0;border-radius:4px}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>STIGA FINANCE</h1></div>
  <div class="content">
    <h2>Olá, ${name}! 👋</h2>
    <p>Seu pagamento foi confirmado e sua conta está ativa.</p>
    <div class="box">
      <p><strong style="color:#F4E5C3">🔐 Suas Credenciais:</strong></p>
      <p><strong>Email:</strong><br><span class="val">${email}</span></p>
      <p><strong>Senha:</strong><br><span class="val">${password}</span></p>
    </div>
    <div class="alert"><strong>⚠️ Importante:</strong> Guarde essas credenciais em local seguro.</div>
    <div style="text-align:center;margin:30px 0">
      <a href="https://stiga-finance.vercel.app" class="btn">ACESSAR O SISTEMA →</a>
    </div>
  </div>
  <div class="footer">
    <p>Suporte: <a href="mailto:suporte@stigafinance.com" style="color:#D4AF37">suporte@stigafinance.com</a></p>
    <p style="font-size:12px;color:#666">© ${new Date().getFullYear()} Stiga Finance.</p>
  </div>
</div>
</body></html>`,
    });

    console.log('E-mail enviado para:', email);
}
