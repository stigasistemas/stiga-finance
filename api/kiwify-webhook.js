// ================================================================
// STIGA FINANCE — WEBHOOK KIWIFY
// Função serverless que roda na Vercel
// Recebe notificação de compra e cria usuário automaticamente
// ================================================================

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// ================================================================
// INICIALIZAR FIREBASE — usa variáveis de ambiente da Vercel
// ================================================================
if (!admin.apps.length) {
    const projectId    = process.env.FIREBASE_PROJECT_ID;
    const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;

    // Garante que \n vira quebra de linha real, independente de como
    // a Vercel entregou a variável
    const privateKey   = (process.env.FIREBASE_PRIVATE_KEY || '')
                            .split('\\n').join('\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Variáveis de ambiente Firebase não configuradas. ' +
            'Verifique FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY na Vercel.'
        );
    }

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
// CONFIGURAR NODEMAILER (Gmail)
// ================================================================
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ================================================================
// HANDLER PRINCIPAL
// ================================================================
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        console.log('📦 Webhook recebido:', JSON.stringify(payload, null, 2));

        if (!payload.Customer || !payload.Customer.email) {
            return res.status(400).json({ error: 'Dados inválidos: Customer.email ausente' });
        }

        const status = payload.order_status || payload.Order?.status;
        if (status !== 'paid' && status !== 'approved') {
            console.log('⏳ Compra ainda não aprovada:', status);
            return res.status(200).json({ message: 'Aguardando aprovação do pagamento' });
        }

        const customerEmail = payload.Customer.email.toLowerCase().trim();
        const customerName  = payload.Customer.full_name
                           || payload.Customer.first_name
                           || 'Cliente';
        const orderId       = payload.order_id || payload.Order?.id || Date.now();

        const password = generateStrongPassword();

        // Criar (ou atualizar) usuário no Firebase Auth
        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({
                email:       customerEmail,
                password:    password,
                displayName: customerName,
                disabled:    false,
            });
            console.log('✅ Usuário criado:', firebaseUser.uid);
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                firebaseUser = await auth.getUserByEmail(customerEmail);
                await auth.updateUser(firebaseUser.uid, { password });
                console.log('🔄 Usuário existente — senha atualizada:', firebaseUser.uid);
            } else {
                throw err;
            }
        }

        // Salvar no Firestore
        await db.collection('users').doc(firebaseUser.uid).set({
            email:              customerEmail,
            name:               customerName,
            orderId:            orderId,
            createdAt:          admin.firestore.FieldValue.serverTimestamp(),
            subscriptionStatus: 'active',
            plan:               'basic',
        });

        // Enviar e-mail de boas-vindas
        await sendWelcomeEmail(customerEmail, customerName, password);

        console.log('🎉 Processo concluído para:', customerEmail);
        return res.status(200).json({
            success: true,
            message: 'Usuário criado e e-mail enviado',
            userId:  firebaseUser.uid,
        });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
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
    pwd += upper  [Math.floor(Math.random() * upper.length)];
    pwd += lower  [Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    const all = upper + lower + numbers + symbols;
    for (let i = 0; i < 8; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
    }

    return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

// ================================================================
// ENVIAR E-MAIL DE BOAS-VINDAS
// ================================================================
async function sendWelcomeEmail(email, name, password) {
    const mailOptions = {
        from:    `"Stiga Finance" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: '🎉 Bem-vindo ao Stiga Finance — Suas Credenciais de Acesso',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#0A0E17;color:#E0E0E0;margin:0;padding:0}
        .container{max-width:600px;margin:40px auto;background:linear-gradient(135deg,#1a1f2e 0%,#0f1419 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,.2)}
        .header{background:linear-gradient(135deg,#D4AF37 0%,#B8942A 100%);padding:30px;text-align:center}
        .header h1{margin:0;color:#0A0E17;font-size:28px;letter-spacing:2px}
        .content{padding:40px 30px}
        .content h2{color:#D4AF37;margin-top:0}
        .box{background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3);border-radius:12px;padding:24px;margin:24px 0}
        .box p{margin:8px 0;font-size:15px}
        .box strong{color:#F4E5C3;font-size:16px}
        .val{background:rgba(0,0,0,.3);padding:10px 14px;border-radius:6px;font-family:'Courier New',monospace;color:#D4AF37;margin-top:6px;display:inline-block;font-size:15px}
        .btn{display:inline-block;background:linear-gradient(135deg,#D4AF37 0%,#B8942A 100%);color:#0A0E17;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;letter-spacing:1px}
        .footer{background:rgba(0,0,0,.3);padding:20px;text-align:center;color:#888;font-size:13px;border-top:1px solid rgba(212,175,55,.1)}
        .alert{background:rgba(231,76,60,.1);border-left:3px solid #E74C3C;padding:14px;margin:20px 0;border-radius:4px}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>STIGA FINANCE</h1>
        <p style="margin:8px 0 0;color:#0A0E17;font-size:14px;letter-spacing:1px">GESTÃO FINANCEIRA INTELIGENTE</p>
    </div>
    <div class="content">
        <h2>Olá, ${name}! 👋</h2>
        <p style="font-size:16px;line-height:1.6">
            Obrigado por adquirir o <strong style="color:#D4AF37">Stiga Finance</strong>!
            Seu pagamento foi confirmado e sua conta está ativa.
        </p>
        <div class="box">
            <p><strong>🔐 Suas Credenciais de Acesso:</strong></p>
            <p style="margin-top:16px"><strong>Email:</strong><br>
                <span class="val">${email}</span>
            </p>
            <p style="margin-top:16px"><strong>Senha:</strong><br>
                <span class="val">${password}</span>
            </p>
        </div>
        <div class="alert">
            <strong>⚠️ Importante:</strong> Guarde essas credenciais em local seguro.
        </div>
        <div style="text-align:center;margin:30px 0">
            <a href="https://SEU_DOMINIO_AQUI.com" class="btn">ACESSAR O SISTEMA →</a>
        </div>
        <p style="font-size:14px;line-height:1.6;color:#AAA">
            <strong>O que você pode fazer no Stiga Finance:</strong><br>
            ✓ Registrar créditos e débitos<br>
            ✓ Gerenciar compras parceladas<br>
            ✓ Criar orçamentos mensais<br>
            ✓ Definir metas financeiras<br>
            ✓ Visualizar gráficos e relatórios<br>
            ✓ Agendar transações recorrentes<br>
            ✓ Exportar dados em PDF/CSV
        </p>
    </div>
    <div class="footer">
        <p>Precisa de ajuda? Entre em contato:<br>
        <a href="mailto:suporte@stigafinance.com" style="color:#D4AF37">suporte@stigafinance.com</a></p>
        <p style="margin-top:12px;font-size:12px;color:#666">
            © ${new Date().getFullYear()} Stiga Finance. Todos os direitos reservados.
        </p>
    </div>
</div>
</body>
</html>`,
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 E-mail enviado para:', email);
}
