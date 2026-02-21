// ============================================================
// STIGA FINANCE — WEBHOOK KIWIFY
// ============================================================

const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

// ── Firebase Admin ──────────────────────────────────────────
// Lê o firebase-key.json direto do arquivo (mais confiável na Vercel)
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./firebase-key.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin inicializado via firebase-key.json');
    } catch (e) {
        console.error('❌ Erro ao inicializar Firebase Admin:', e.message);
    }
}

// ── Gera senha aleatória segura ─────────────────────────────
function generatePassword(len = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Template HTML do email ──────────────────────────────────
function buildEmailHTML(name, email, password) {
    const firstName = name.split(' ')[0];
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Stiga Finance</title>
</head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E17;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(160deg,#1a1f2e 0%,#0f1420 100%);border-radius:20px 20px 0 0;border:1px solid rgba(212,175,55,0.25);border-bottom:none;padding:48px 40px 36px;text-align:center;">
            <div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#B8942A);margin:0 auto 24px;line-height:88px;font-size:38px;text-align:center;box-shadow:0 0 50px rgba(212,175,55,0.35);">💰</div>
            <p style="font-size:10px;letter-spacing:4px;color:#D4AF37;text-transform:uppercase;margin:0 0 8px;font-family:Arial,sans-serif;">Bem-vindo a</p>
            <h1 style="margin:0;font-size:30px;font-weight:bold;letter-spacing:5px;color:#F4E5C3;font-family:Georgia,serif;">STIGA FINANCE</h1>
            <p style="margin:8px 0 0;font-size:12px;letter-spacing:2px;color:#8A95A3;font-family:Arial,sans-serif;">Gestão Financeira Inteligente</p>
            <div style="width:80px;height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);margin:28px auto 0;"></div>
          </td>
        </tr>

        <!-- CORPO -->
        <tr>
          <td style="background:#12172a;border-left:1px solid rgba(212,175,55,0.25);border-right:1px solid rgba(212,175,55,0.25);padding:40px 40px 32px;">
            <h2 style="margin:0 0 6px;font-size:22px;color:#F4E5C3;font-family:Georgia,serif;">Olá, ${firstName}! 👋</h2>
            <p style="margin:0 0 28px;font-size:13px;color:#8A95A3;line-height:1.7;font-family:Arial,sans-serif;">
              É um prazer ter você conosco. Sua conta no <strong style="color:#D4AF37;">Stiga Finance</strong> está ativa e pronta para uso. A partir de agora você tem em mãos uma ferramenta completa para organizar, acompanhar e transformar sua vida financeira.
            </p>

            <!-- Card credenciais -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.45);border:1px solid rgba(212,175,55,0.3);border-radius:14px;margin-bottom:20px;overflow:hidden;">
              <tr><td style="padding:12px 24px 10px;border-bottom:1px solid rgba(212,175,55,0.12);">
                <p style="margin:0;font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">🔐 Suas Credenciais de Acesso</p>
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

            <!-- Aviso segurança -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-left:3px solid #D4AF37;border-radius:8px;margin-bottom:32px;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0;font-size:13px;color:#F4E5C3;font-family:Arial,sans-serif;line-height:1.5;">
                  ⚠️ <strong>Guarde suas credenciais em local seguro.</strong><br>
                  <span style="color:#8A95A3;font-size:12px;">Recomendamos alterar sua senha após o primeiro acesso.</span>
                </p>
              </td></tr>
            </table>

            <!-- Botão CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
              <tr><td align="center">
                <a href="https://stigasistemas.github.io/stiga-finance/"
                   style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:16px 44px;border-radius:10px;box-shadow:0 6px 24px rgba(212,175,55,0.35);">
                  ACESSAR O SISTEMA →
                </a>
              </td></tr>
            </table>

            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent);margin-bottom:32px;"></div>

            <!-- Features -->
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:3px;color:#D4AF37;text-transform:uppercase;font-family:Arial,sans-serif;">✨ O que você pode fazer com o Stiga Finance</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 6px 12px 0;vertical-align:top;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
                    <tr><td style="padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:18px;">💳</p>
                      <p style="margin:0 0 2px;font-size:12px;color:#F4E5C3;font-family:Arial,sans-serif;font-weight:bold;">Controle de Gastos</p>
                      <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Registre entradas e saídas com categorias</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 12px 6px;vertical-align:top;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
                    <tr><td style="padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:18px;">📊</p>
                      <p style="margin:0 0 2px;font-size:12px;color:#F4E5C3;font-family:Arial,sans-serif;font-weight:bold;">Gráficos e Relatórios</p>
                      <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Visualize sua saúde financeira</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 6px 0 0;vertical-align:top;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
                    <tr><td style="padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:18px;">🎯</p>
                      <p style="margin:0 0 2px;font-size:12px;color:#F4E5C3;font-family:Arial,sans-serif;font-weight:bold;">Metas Financeiras</p>
                      <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Defina e acompanhe seus objetivos</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 0 6px;vertical-align:top;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);border-radius:10px;">
                    <tr><td style="padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:18px;">🤖</p>
                      <p style="margin:0 0 2px;font-size:12px;color:#F4E5C3;font-family:Arial,sans-serif;font-weight:bold;">Assistente IA</p>
                      <p style="margin:0;font-size:11px;color:#8A95A3;font-family:Arial,sans-serif;">Tire dúvidas financeiras na hora</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- AGRADECIMENTO -->
        <tr>
          <td style="background:linear-gradient(160deg,#0f1420,#1a1f2e);border:1px solid rgba(212,175,55,0.25);border-top:none;border-bottom:none;padding:32px 40px;">
            <p style="margin:0 0 12px;font-size:14px;color:#F4E5C3;font-family:Georgia,serif;font-style:italic;line-height:1.7;">
              "Muito obrigado por confiar no Stiga Finance para cuidar das suas finanças. Nossa missão é simplificar sua relação com o dinheiro e ajudá-lo a conquistar seus objetivos com clareza e controle."
            </p>
            <p style="margin:0;font-size:12px;color:#D4AF37;font-family:Arial,sans-serif;font-weight:bold;">— Equipe Stiga Sistemas</p>
          </td>
        </tr>

        <!-- SUPORTE -->
        <tr>
          <td style="background:#0f1420;border:1px solid rgba(212,175,55,0.25);border-top:1px solid rgba(212,175,55,0.1);padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#8A95A3;font-family:Arial,sans-serif;">Precisa de ajuda? Entre em contato:</p>
            <a href="mailto:suporte@stigasistemas.com.br" style="color:#D4AF37;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;">suporte@stigasistemas.com.br</a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#080b12;border-radius:0 0 20px 20px;border:1px solid rgba(212,175,55,0.15);border-top:none;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;color:#4a5568;font-family:Arial,sans-serif;">© ${year} Stiga Sistemas. Todos os direitos reservados.</p>
            <p style="margin:0;font-size:10px;color:#2d3748;font-family:Arial,sans-serif;">Este email foi enviado automaticamente após sua compra. Não responda a este email.</p>
          </td>
        </tr>

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
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar variáveis de ambiente
    if (!process.env.GMAIL_PASS) {
        console.error('❌ GMAIL_PASS não configurada nas variáveis de ambiente da Vercel!');
        return res.status(500).json({ error: 'Configuração incompleta: GMAIL_PASS ausente. Configure nas variáveis de ambiente da Vercel.' });
    }

    try {
        const payload = req.body;
        console.log('📦 Payload recebido:', JSON.stringify(payload));

        // Verificar status do pagamento
        const status = payload?.order_status || payload?.status;
        if (status !== 'paid' && status !== 'approved') {
            console.log('⏭️ Evento ignorado, status:', status);
            return res.status(200).json({ message: 'Evento ignorado: pagamento não aprovado', status });
        }

        // Extrair dados do comprador
        const customer  = payload?.Customer || payload?.customer || {};
        const email     = customer.email || payload?.customer_email || payload?.email;
        const name      = customer.name || customer.full_name || customer.first_name || payload?.customer_name || 'Cliente';

        if (!email) {
            console.error('❌ Email não encontrado no payload');
            return res.status(400).json({ error: 'Email do cliente não encontrado', payload });
        }

        console.log(`👤 Processando: ${name} <${email}>`);

        // Gerar senha
        const password = generatePassword(10);

        // Criar usuário no Firebase Auth
        let uid;
        try {
            const userRecord = await admin.auth().createUser({ email, password, displayName: name });
            uid = userRecord.uid;
            console.log('✅ Usuário criado no Firebase:', uid);
        } catch (err) {
            if (err.code === 'auth/email-already-exists') {
                const existing = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(existing.uid, { password });
                uid = existing.uid;
                console.log('♻️ Usuário já existe, senha atualizada:', uid);
            } else {
                throw err;
            }
        }

        // Inicializar Firestore
        const db = admin.firestore();
        await db.collection('userData').doc(uid).set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            plan: 'basic', email, name,
            accounts: {
                main: { name: '💰 Conta Principal', credits: [], debits: [], futurePurchases: [] }
            }
        }, { merge: true });
        console.log('✅ Dados salvos no Firestore');

        // Enviar email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'stigasistemas@gmail.com',
                pass: process.env.GMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: '"Stiga Finance" <stigasistemas@gmail.com>',
            to: email,
            subject: '✨ Bem-vindo ao Stiga Finance — Suas Credenciais de Acesso',
            html: buildEmailHTML(name, email, password)
        });
        console.log('✅ Email enviado para:', email);

        return res.status(200).json({ success: true, message: `Usuário ${email} criado com sucesso`, uid });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
};
