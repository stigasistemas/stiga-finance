$pass = "cjrw crwp lqvw waks"

$s = New-Object Net.Mail.SmtpClient("smtp.gmail.com", 587)
$s.EnableSsl = $true
$s.Credentials = New-Object Net.NetworkCredential("matheusempresarial0001@gmail.com", $pass)

$m = New-Object Net.Mail.MailMessage
$m.From = New-Object Net.Mail.MailAddress("matheusempresarial0001@gmail.com", "Stiga Finance")
$m.To.Add("matheusempresarial0001@gmail.com")
$m.Subject = "Teste - Stiga Finance"
$m.IsBodyHtml = $true
$m.Body = "<div style='background:#0A0E17;padding:30px;font-family:Arial'><div style='max-width:480px;margin:0 auto;background:#12172a;border:1px solid #D4AF37;border-radius:16px;padding:36px;text-align:center'><p style='font-size:48px;margin:0'>💰</p><h1 style='color:#D4AF37;letter-spacing:4px;margin:10px 0 4px'>STIGA FINANCE</h1><p style='color:#8A95A3;font-size:12px;letter-spacing:2px'>Gestao Financeira Inteligente</p><hr style='border-color:rgba(212,175,55,0.2);margin:24px 0'><h2 style='color:#F4E5C3;margin:0 0 8px'>Ola, Matheus!</h2><p style='color:#8A95A3;margin:0 0 24px'>Sua conta esta ativa e pronta para uso.</p><div style='background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:10px;padding:20px;text-align:left;margin-bottom:24px'><p style='color:#8A95A3;font-size:10px;margin:0 0 3px'>EMAIL</p><p style='color:#F4E5C3;font-family:monospace;margin:0 0 14px'>matheusempresarial0001@gmail.com</p><p style='color:#8A95A3;font-size:10px;margin:0 0 3px'>SENHA</p><p style='color:#D4AF37;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:3px;margin:0'>StigaTest@2026</p></div><a href='https://stigasistemas.github.io/stiga-finance/' style='display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;letter-spacing:2px;font-size:13px'>ACESSAR O SISTEMA</a><p style='color:#4a5568;font-size:10px;margin-top:28px'>2026 Stiga Sistemas</p></div></div>"

$s.Send($m)
Write-Host "EMAIL ENVIADO COM SUCESSO!" -ForegroundColor Green
