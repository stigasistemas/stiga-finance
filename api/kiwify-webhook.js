// ============================================================
// STIGA FINANCE — WEBHOOK KIWIFY
// Variáveis de ambiente (conforme configurado na Vercel):
//   EMAIL_USER  = stigasistemas@gmail.com
//   EMAIL_PASS  = App Password do Google (16 chars)
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ============================================================

const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

// ── Firebase Admin via variáveis de ambiente ────────────────
if (!admin.apps.length) {
    try {
        // Tenta primeiro via variáveis de ambiente
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId:   process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
            console.log('✅ Firebase via variáveis de ambiente');
        } else {
            // Fallback: arquivo local
            const serviceAccount = require('../firebase-key.json');
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('✅ Firebase via firebase-key.json');
        }
    } catch (e) {
        console.error('❌ Erro Firebase:', e.message);
    }
}

// ── Gera senha aleatória ────────────────────────────────────
function generatePassword(len = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Template HTML do email ──────────────────────────────────
function buildEmailHTML(name, email, password) {
    const firstName = (name || 'Cliente').split(' ')[0];
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E17;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(160deg,#1a1f2e,#0f1420);border-radius:20px 20px 0 0;border:1px solid rgba(212,175,55,0.25);border-bottom:none;padding:48px 40px 36px;text-align:center;">
  <div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8942A);margin:0 auto 24px;line-height:88px;font-size:38px;text-align:center;box-shadow:0 0 50px rgba(212,175,55,0.35);">&#128176;</div>
  <p style="font-size:10px;letter-spacing:4px;color:#D4AF37;text-transform:uppercase;margin:0 0 8px;font-family:Arial,sans-serif;">Bem-vindo a</p>
  <h1 style="margin:0;font-size:30px;font-weight:bold;letter-spacing:5px;color:#F4E5C3;font-family:Georgia,serif;">STIGA FINANCE</h1>
  <p style="margin:8px 0 0;font-size:12px;letter-spacing:2px;color:#8A95A3;font-family:Arial,sans-serif;">Gestao Financeira Inteligente</p>
  <div style="width:80px;height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);margin:28px auto 0;"></div>
</td></tr>

<tr><td style="background:#12172a;border-left:1px solid rgba(212,175,55,0.25);border-right:1px solid rgba(212,175,55,0.25);padding:40px 40px 32px;">
  <h2 style="margin:0 0 6px;font-size:22px;color:#F4E5C3;font-family:Georgia,serif;">Ola, ${firstName}!</h2>
  <p style="margin:0 0 28px;font-size:13px;color:#8A95A3;line-height:1.7;font-family:Arial,sans-serif;">
    E um prazer ter voce conosco. Sua conta no <strong style="color:#D4AF37;">Stiga Finance</strong> esta ativa e pronta para uso!
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.45);border:1px solid rgba(212,175,55,0.3);border-radius:14px;margin-bottom:20px;">
    <tr><td style="padding:12px 24px 10px;border-bottom:1px solid rgba(212,175,55,0.12);">
      <p style="margin:0;font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">Suas Credenciais de Acesso</p>
    </td></tr>
    <tr><td style="padding:18px 24px 6px;">
      <p style="margin:0 0 4px;font-size:10px;color:#8A95A3;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">Email</p>
      <p style="margin:0;font-size:15px;color:#F4E5C3;font-family:'Courier New',monospace;">${email}</p>
    </td></tr>
    <tr><td style="padding:14px 24px 20px;">
      <p style="margin:0 0 4px;font-size:10px;color:#8A95A3;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">Senha</p>
      <p style="margin:0;font-size:20px;color:#D4AF37;font-family:'Courier New',monospace;letter-spacing:3px;font-weight:bold;">${password}</p>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-left:3px solid #D4AF37;border-radius:8px;margin-bottom:32px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#F4E5C3;font-family:Arial,sans-serif;line-height:1.5;">
        <strong>Guarde suas credenciais em local seguro.</strong><br>
        <span style="color:#8A95A3;font-size:12px;">Recomendamos alterar sua senha apos o primeiro acesso.</span>
      </p>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
    <tr><td align="center">
      <a href="https://stigasistemas.github.io/stiga-finance/" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:16px 44px;border-radius:10px;">
        ACESSAR O SISTEMA
      </a>
    </td></tr>
  </table>
</td></tr>

<tr><td style="background:linear-gradient(160deg,#0f1420,#1a1f2e);border:1px solid rgba(212,175,55,0.25);border-top:none;border-bottom:none;padding:32px 40px;">
  <p style="margin:0 0 8px;font-size:14px;color:#F4E5C3;font-family:Georgia,serif;font-style:italic;line-height:1.7;">
    "Muito obrigado por confiar no Stiga Finance. Nossa missao e simplificar sua relacao com o dinheiro."
  </p>
  <p style="margin:0;font-size:12px;color:#D4AF37;font-family:Arial,sans-serif;font-weight:bold;">- Equipe Stiga Sistemas</p>
</td></tr>

<tr><td style="background:#080b12;border-radius:0 0 20px 20px;border:1px solid rgba(212,175,55,0.15);border-top:none;padding:24px 40px;text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:#4a5568;font-family:Arial,sans-serif;">Duvidas? suporte@stigasistemas.com.br</p>
  <p style="margin:0;font-size:10px;color:#2d3748;font-family:Arial,sans-serif;">© ${year} Stiga Sistemas. Todos os direitos reservados.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Handler principal ───────────────────────────────────────
module.exports = async (req, res) => {
    console.log('📨 Webhook recebido:', req.method);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    // ── Verificar variáveis obrigatórias ──
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailPass) {
        console.error('❌ EMAIL_PASS nao configurada!');
        return res.status(500).json({ error: 'EMAIL_PASS ausente nas variaveis de ambiente da Vercel' });
    }
    if (!emailUser) {
        console.error('❌ EMAIL_USER nao configurada!');
        return res.status(500).json({ error: 'EMAIL_USER ausente nas variaveis de ambiente da Vercel' });
    }

    try {
        const payload = req.body;
        console.log('📦 Payload:', JSON.stringify(payload));

        // Aceitar qualquer variação de status pago
        const status = payload?.order_status || payload?.status;
        if (status !== 'paid' && status !== 'approved' && status !== 'complete') {
            return res.status(200).json({ message: 'Evento ignorado, status: ' + status });
        }

        // Extrair dados do comprador — suporta vários formatos da Kiwify
        const customer = payload?.Customer || payload?.customer || {};
        const email    = customer.email || payload?.customer_email || payload?.email;
        const name     = customer.name || customer.full_name || customer.first_name || payload?.customer_name || 'Cliente';

        if (!email) {
            console.error('❌ Email nao encontrado no payload');
            return res.status(400).json({ error: 'Email do cliente nao encontrado', payload });
        }

        console.log(`👤 Processando: ${name} <${email}>`);

        // ── Criar usuário no Firebase Auth ──
        const password = generatePassword(10);
        let uid;

        try {
            const userRecord = await admin.auth().createUser({ email, password, displayName: name });
            uid = userRecord.uid;
            console.log('✅ Usuario criado:', uid);
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                const existing = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(existing.uid, { password });
                uid = existing.uid;
                console.log('♻️ Senha atualizada para usuario existente:', uid);
            } else {
                throw err;
            }
        }

        // ── Salvar no Firestore ──
        try {
            const db = admin.firestore();
            await db.collection('userData').doc(uid).set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                plan: 'basic', email, name,
                accounts: {
                    main: { name: '💰 Conta Principal', credits: [], debits: [], futurePurchases: [] }
                }
            }, { merge: true });
            console.log('✅ Dados salvos no Firestore');
        } catch (fsErr) {
            console.error('⚠️ Erro Firestore (nao critico):', fsErr.message);
        }

        // ── Enviar email ──
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass }
        });

        await transporter.sendMail({
            from: `"Stiga Finance" <${emailUser}>`,
            to: email,
            subject: 'Bem-vindo ao Stiga Finance - Suas Credenciais de Acesso',
            html: buildEmailHTML(name, email, password)
        });
        console.log('✅ Email enviado para:', email);

        return res.status(200).json({ success: true, uid, message: `Usuario ${email} criado com sucesso` });

    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);
        return res.status(500).json({ error: error.message });
    }
};