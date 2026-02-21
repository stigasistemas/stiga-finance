$body = '{"order_status":"paid","order_id":"TEST-001","Customer":{"name":"Matheus Oliveira","email":"matheusempresarial0001@gmail.com"},"product":{"name":"Stiga Finance"},"payment":{"method":"credit_card","amount":990}}'

Invoke-RestMethod -Uri "https://stiga-finance.vercel.app/api/kiwify-webhook" -Method POST -ContentType "application/json" -Body $body