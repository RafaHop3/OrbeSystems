@echo off
:: Garante que o diretorio de execucao seja o da pasta do script
cd /d "%~dp0"

echo ===================================================
echo [Orbe Systems] Preparando Git Push das Alteracoes
echo ===================================================
echo.
echo 1. Atualizando hashes criptograficos de conformidade...
python update_project_hashes.py
echo.
echo 2. Adicionando arquivos modificados ao Git...
git add .
echo.
echo 3. Criando commit com as novas implementacoes...
git commit -m "feat: documentos legais, agente offline e melhorias de seguranca no IMORTAL"
echo.
echo 4. Enviando para o repositorio remoto (GitHub)...
git push
echo.
echo ===================================================
echo Sync Completo! O Render iniciara o auto-redeploy.
echo ===================================================
pause
