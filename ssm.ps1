$env:AWS_PAGER = ""
aws ssm send-command `
    --instance-ids "i-058e26140671b3254" `
    --document-name "AWS-RunShellScript" `
    --parameters 'commands=["cd /home/ubuntu/OrbeSystems","sudo chown -R ubuntu:ubuntu .","git reset --hard","git pull origin main","docker rm -f inho-backend-green","docker system prune -af","docker compose up -d --build inho_backend","docker compose stop whatsapp","sudo rm -rf whatsapp_bot/auth_info_baileys/*","docker compose up -d --build whatsapp"]' `
    --output text | Out-String
