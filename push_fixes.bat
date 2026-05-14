@echo off
echo Preparando para fazer o push das alteracoes para o GitHub...
git add .
git commit -m "feat: implement RBAC and Premium Stripe Subscription"
git push
echo.
echo Push concluido! O Render deve iniciar o redeploy automaticamente.
pause
