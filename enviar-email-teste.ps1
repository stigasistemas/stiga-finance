# App Password do stigasistemas@gmail.com (EMAIL_PASS da Vercel)
$EMAIL_PASS = "cjrw crwp lqvw waks"

$s = New-Object Net.Mail.SmtpClient("smtp.gmail.com", 587)
$s.EnableSsl = $true
$s.Credentials = New-Object Net.NetworkCredential("stigasistemas@gmail.com", $EMAIL_PASS)
$m = New-Object Net.Mail.MailMessage
$m.From = New-Object Net.Mail.MailAddress("stigasistemas@gmail.com", "Stiga Finance")
$m.To.Add("matheusempresarial0001@gmail.com")
$m.Subject = "Teste - Stiga Finance"
$m.IsBodyHtml = $true
$m.Body = "<div style='background:#0A0E17;padding:30px;font-family:Arial'><div style='max-width:480px;margin:0 auto;background:#12172a;border:1px solid #D4AF37;border-radius:16px;padding:36px;text-align:center'><h1 style='color:#D4AF37'>STIGA FINANCE</h1><h2 style='color:#F4E5C3'>Ola, Matheus!</h2><p style='color:#8A95A3'>Sua conta esta ativa!</p><div style='background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:10px;padding:20px;text-align:left;margin:20px 0'><p style='color:#8A95A3;font-size:11px;margin:0 0 3px'>EMAIL</p><p style='color:#F4E5C3;font-family:monospace;margin:0 0 14px'>matheusempresarial0001@gmail.com</p><p style='color:#8A95A3;font-size:11px;margin:0 0 3px'>SENHA</p><p style='color:#D4AF37;font-family:monospace;font-size:20px;font-weight:bold;margin:0'>StigaTest2026</p></div><a href='https://stigasistemas.github.io/stiga-finance/' style='display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8942A);color:#0A0E17;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold'>ACESSAR O SISTEMA</a></div></div>"
$s.Send($m)
Write-Host "EMAIL ENVIADO!" -ForegroundColor Green