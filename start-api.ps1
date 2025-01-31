Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/index.js"
Start-Sleep -Seconds 5
Invoke-WebRequest -Uri "http://localhost:3000/api/ultimas-noticias" -Headers @{"x-api-key"="123456"} -UseBasicParsing




