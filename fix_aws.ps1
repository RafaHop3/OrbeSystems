$env:AWS_PAGER = ""
aws ssm send-command `
    --instance-ids "i-058e26140671b3254" `
    --document-name "AWS-RunShellScript" `
    --parameters 'commands=["cd /home/ubuntu/OrbeSystems","sudo chown -R ubuntu:ubuntu .","git pull origin main","docker rm -f inho-backend-green","cd inho_backend","git pull origin main","cd ..","docker compose up -d --build backend inho_backend"]' `
    --output text | Out-String
