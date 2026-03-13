// ============================================================
// STIGA FINANCE — WEBHOOK KIWIFY
// Variáveis de ambiente (conforme configurado na Vercel):
//   EMAIL_USER        = stigasistemas@gmail.com
//   EMAIL_PASS        = App Password do Google (16 chars)
//   KIWIFY_SECRET     = segredo do webhook configurado na Kiwify
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ============================================================

const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

// ── Firebase Admin via variáveis de ambiente ────────────────
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId:   process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        } else {
            const serviceAccount = require('../firebase-key.json');
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
    } catch (e) {
        console.error('❌ Erro Firebase:', e.message);
    }
}

// ── Verificar assinatura da Kiwify ──────────────────────────
function verifyKiwifySignature(req) {
    const secret = process.env.KIWIFY_SECRET;
    if (!secret) return false;
    const signature = req.headers['x-kiwify-signature'] || req.headers['x-signature'] || '';
    if (!signature) return false;
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch { return false; }
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
    const orderDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Bem-vindo ao Stiga Finance</title>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- TOPO DOURADO -->
  <tr><td style="background:linear-gradient(90deg,#B8942A,#D4AF37,#F4E5C3,#D4AF37,#B8942A);height:4px;border-radius:16px 16px 0 0;"></td></tr>

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(160deg,#0d1117 0%,#1a1f2e 60%,#0d1117 100%);padding:44px 40px 36px;text-align:center;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <img src="https://stigasistemas.github.io/stiga-finance/logo-stiga.png" alt="Stiga Finance" width="88" height="88" style="display:block;margin:0 auto 20px;border-radius:50%;border:2px solid rgba(212,175,55,0.4);box-shadow:0 0 32px rgba(212,175,55,0.3);">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:5px;color:#D4AF37;text-transform:uppercase;font-family:Georgia,serif;">Gestão Financeira Inteligente</p>
    <h1 style="margin:0;font-size:28px;font-weight:bold;letter-spacing:6px;color:#F4E5C3;font-family:Georgia,serif;">STIGA FINANCE</h1>
    <div style="width:100px;height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);margin:20px auto 0;"></div>
  </td></tr>

  <!-- BADGE COMPRA CONFIRMADA -->
  <tr><td style="background:#12172a;padding:28px 40px 0;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:linear-gradient(135deg,rgba(46,204,113,0.12),rgba(46,204,113,0.06));border:1px solid rgba(46,204,113,0.3);border-radius:12px;padding:18px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48" style="vertical-align:middle;">
              <div style="width:44px;height:44px;background:rgba(46,204,113,0.15);border-radius:50%;text-align:center;line-height:44px;font-size:22px;">&#10003;</div>
            </td>
            <td style="vertical-align:middle;padding-left:16px;">
              <p style="margin:0 0 2px;font-size:16px;font-weight:bold;color:#2ECC71;font-family:Arial,sans-serif;">Compra Confirmada!</p>
              <p style="margin:0;font-size:12px;color:#8A95A3;font-family:Arial,sans-serif;">Pedido processado em ${orderDate}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- SAUDAÇÃO -->
  <tr><td style="background:#12172a;padding:28px 40px 24px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <p style="margin:0 0 12px;font-size:22px;font-weight:bold;color:#F4E5C3;font-family:Georgia,serif;">Olá, ${firstName}! 👋</p>
    <p style="margin:0;font-size:14px;color:#8A95A3;line-height:1.8;font-family:Arial,sans-serif;">
      Seja muito bem-vindo ao <strong style="color:#D4AF37;">Stiga Finance</strong>! Sua jornada rumo ao controle financeiro começa agora. Abaixo você encontra tudo o que precisa para dar o primeiro passo.
    </p>
  </td></tr>

  <!-- DIVISOR -->
  <tr><td style="background:#12172a;padding:0 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.25),transparent);"></div>
  </td></tr>

  <!-- CREDENCIAIS -->
  <tr><td style="background:#12172a;padding:28px 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">&#128273; Suas Credenciais de Acesso</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.5);border:1px solid rgba(212,175,55,0.25);border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:18px 24px 14px;border-bottom:1px solid rgba(212,175,55,0.1);">
          <p style="margin:0 0 5px;font-size:10px;color:#8A95A3;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">&#128231; Email de Acesso</p>
          <p style="margin:0;font-size:15px;color:#F4E5C3;font-family:'Courier New',monospace;font-weight:bold;">${email}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px 18px;">
          <p style="margin:0 0 5px;font-size:10px;color:#8A95A3;text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">&#128274; Senha Inicial</p>
          <p style="margin:0;font-size:26px;color:#D4AF37;font-family:'Courier New',monospace;letter-spacing:4px;font-weight:bold;">${password}</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr><td style="background:rgba(212,175,55,0.06);border-left:3px solid #D4AF37;border-radius:0 8px 8px 0;padding:12px 16px;">
        <p style="margin:0;font-size:12px;color:#F4E5C3;line-height:1.6;font-family:Arial,sans-serif;">
          <strong>&#9888; Importante:</strong> Guarde suas credenciais em local seguro. Recomendamos alterar sua senha após o primeiro acesso.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- DIVISOR -->
  <tr><td style="background:#12172a;padding:0 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.25),transparent);"></div>
  </td></tr>

  <!-- PRÓXIMOS PASSOS -->
  <tr><td style="background:#12172a;padding:28px 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <p style="margin:0 0 20px;font-size:11px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">&#128640; Seus Próximos Passos</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td width="36" style="vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#D4AF37,#B8942A);border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:bold;color:#0A0E17;font-family:Arial,sans-serif;">1</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <p style="margin:0 0 3px;font-size:14px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Acesse o sistema</p>
          <p style="margin:0;font-size:12px;color:#8A95A3;line-height:1.6;font-family:Arial,sans-serif;">Entre com o email e senha acima no Stiga Finance</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td width="36" style="vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#D4AF37,#B8942A);border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:bold;color:#0A0E17;font-family:Arial,sans-serif;">2</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <p style="margin:0 0 3px;font-size:14px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Assista aos tutoriais</p>
          <p style="margin:0;font-size:12px;color:#8A95A3;line-height:1.6;font-family:Arial,sans-serif;">Aprenda a usar todas as funcionalidades com nossas aulas</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="36" style="vertical-align:top;padding-top:2px;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#D4AF37,#B8942A);border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:bold;color:#0A0E17;font-family:Arial,sans-serif;">3</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <p style="margin:0 0 3px;font-size:14px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Comece a usar</p>
          <p style="margin:0;font-size:12px;color:#8A95A3;line-height:1.6;font-family:Arial,sans-serif;">Cadastre seus primeiros lançamentos e veja sua vida financeira se transformar</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- BOTÕES -->
  <tr><td style="background:#12172a;padding:8px 40px 36px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" style="padding-right:8px;">
          <a href="https://stigasistemas.github.io/stiga-finance/" style="display:block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:16px 12px;border-radius:10px;text-align:center;box-shadow:0 6px 20px rgba(212,175,55,0.3);">
            &#128187; Acessar o Sistema
          </a>
        </td>
        <td width="52%" style="padding-left:8px;">
          <a href="https://stigasistemas.github.io/stiga-feedbacks/" style="display:block;background:transparent;color:#D4AF37;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:15px 12px;border-radius:10px;text-align:center;border:1px solid rgba(212,175,55,0.4);">
            &#127916; Ver Tutoriais
          </a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- DIVISOR -->
  <tr><td style="background:#12172a;padding:0 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.25),transparent);"></div>
  </td></tr>

  <!-- O QUE VOCÊ TEM ACESSO -->
  <tr><td style="background:#12172a;padding:28px 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <p style="margin:0 0 18px;font-size:11px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">&#11088; O Que Você Tem Acesso</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:0 6px 10px 0;vertical-align:top;">
          <table width="100%" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:20px;">&#128179;</p>
              <p style="margin:0 0 3px;font-size:12px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Controle de Gastos</p>
              <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Entradas, saídas e categorias</p>
            </td></tr>
          </table>
        </td>
        <td width="50%" style="padding:0 0 10px 6px;vertical-align:top;">
          <table width="100%" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:20px;">&#128202;</p>
              <p style="margin:0 0 3px;font-size:12px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Gráficos e Relatórios</p>
              <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Visualize sua saúde financeira</p>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:0 6px 0 0;vertical-align:top;">
          <table width="100%" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:20px;">&#127919;</p>
              <p style="margin:0 0 3px;font-size:12px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Metas Financeiras</p>
              <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Defina e conquiste objetivos</p>
            </td></tr>
          </table>
        </td>
        <td width="50%" style="padding:0 0 0 6px;vertical-align:top;">
          <table width="100%" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:20px;">&#129302;</p>
              <p style="margin:0 0 3px;font-size:12px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">Assistente IA</p>
              <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Tire dúvidas financeiras</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- MENSAGEM PESSOAL -->
  <tr><td style="background:linear-gradient(160deg,#0f1420,#1a1f2e);padding:32px 40px;text-align:center;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <div style="width:40px;height:1px;background:linear-gradient(90deg,transparent,#D4AF37);margin:0 auto 20px;"></div>
    <p style="margin:0 0 16px;font-size:15px;color:#F4E5C3;font-family:Georgia,serif;font-style:italic;line-height:1.9;">
      "Obrigado por confiar no <strong style="color:#D4AF37;">Stiga Finance</strong>, ${firstName}!<br>
      Você acaba de dar um passo importante para transformar<br>
      sua relação com o dinheiro. Estamos aqui para te ajudar<br>
      em cada etapa dessa jornada. Seja bem-vindo à família!"
    </p>
    <p style="margin:0;font-size:13px;color:#D4AF37;font-weight:bold;font-family:Arial,sans-serif;">— Equipe Stiga Sistemas 💛</p>
    <div style="width:40px;height:1px;background:linear-gradient(90deg,#D4AF37,transparent);margin:20px auto 0;"></div>
  </td></tr>

  <!-- SUPORTE -->
  <tr><td style="background:#0f1420;padding:24px 40px;border-left:1px solid rgba(212,175,55,0.2);border-right:1px solid rgba(212,175,55,0.2);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:#F4E5C3;font-weight:bold;font-family:Arial,sans-serif;">&#128587; Precisa de Ajuda?</p>
          <p style="margin:0 0 10px;font-size:12px;color:#8A95A3;font-family:Arial,sans-serif;">Nossa equipe está pronta para te atender</p>
          <a href="mailto:stigasistemas@gmail.com" style="display:inline-block;color:#D4AF37;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;border-bottom:1px solid rgba(212,175,55,0.3);padding-bottom:2px;">stigasistemas@gmail.com</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- RODAPÉ DOURADO -->
  <tr><td style="background:linear-gradient(90deg,#B8942A,#D4AF37,#F4E5C3,#D4AF37,#B8942A);height:2px;"></td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#080b12;border-radius:0 0 16px 16px;border:1px solid rgba(212,175,55,0.12);border-top:none;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;color:#4a5568;font-family:Arial,sans-serif;">© ${year} Stiga Sistemas. Todos os direitos reservados.</p>
    <p style="margin:0;font-size:10px;color:#2d3748;font-family:Arial,sans-serif;">Este email foi enviado automaticamente após sua compra. Por favor, não responda este email.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Handler principal ───────────────────────────────────────
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    // 🔒 VERIFICAR ASSINATURA DA KIWIFY
    const isValid = verifyKiwifySignature(req);
    if (!isValid) {
        return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailPass) return res.status(500).json({ error: 'EMAIL_PASS ausente' });
    if (!emailUser) return res.status(500).json({ error: 'EMAIL_USER ausente' });

    try {
        const payload = req.body;

        const status = payload?.order_status || payload?.status;
        if (status !== 'paid' && status !== 'approved' && status !== 'complete') {
            return res.status(200).json({ message: 'Evento ignorado, status: ' + status });
        }

        const customer = payload?.Customer || payload?.customer || {};
        const email    = customer.email || payload?.customer_email || payload?.email;
        const name     = customer.name || customer.full_name || customer.first_name || payload?.customer_name || 'Cliente';

        if (!email) {
            return res.status(400).json({ error: 'Email do cliente nao encontrado' });
        }

        // ── Criar usuário no Firebase Auth ──
        const password = generatePassword(10);
        let uid;

        try {
            const userRecord = await admin.auth().createUser({ email, password, displayName: name });
            uid = userRecord.uid;
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                const existing = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(existing.uid, { password });
                uid = existing.uid;
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
        } catch (fsErr) {
            console.error('⚠️ Erro Firestore:', fsErr.message);
        }

        // ── Enviar email ──
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass }
        });

        await transporter.sendMail({
            from: `"Stiga Finance" <${emailUser}>`,
            to: email,
            subject: `✅ Bem-vindo ao Stiga Finance, ${name.split(' ')[0]}! Suas credenciais de acesso`,
            html: buildEmailHTML(name, email, password)
        });

        return res.status(200).json({ success: true, uid, message: `Usuario ${email} criado com sucesso` });

    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
