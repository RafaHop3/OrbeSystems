@echo off
setlocal
echo ===================================================
echo             ORBE CLEANER - WINDOWS PROTOCOL
echo               Deep System Sterilization
echo ===================================================
echo OBS: Este script apagará APENAS arquivos temporarios, 
echo cache npm, containers docker sem uso e a lixeira.
echo Nenhum arquivo de projeto ou banco de dados vivo sera tocado.
echo ===================================================
pause

echo.
echo [1/5] Limpando Cache de DNS...
ipconfig /flushdns

echo [2/5] Purgando pastas TEMP...
del /q /f /s %TEMP%\* >nul 2>&1
rd /s /q %TEMP% >nul 2>&1
md %TEMP% >nul 2>&1

del /q /f /s %WINDIR%\Temp\* >nul 2>&1
rd /s /q %WINDIR%\Temp >nul 2>&1
md %WINDIR%\Temp >nul 2>&1

echo [3/5] Limpando Cache Global do NPM...
call npm cache clean --force >nul 2>&1

echo [4/5] Limpando Docker (Imagens e Containers Abandonados)...
docker system prune -a -f >nul 2>&1

echo [5/5] Esvaziando Lixeira...
PowerShell.exe -NoProfile -Command Clear-RecycleBin -Confirm:$false >nul 2>&1

echo.
echo ===================================================
echo     ASTERILIZACAO COMPLETA. SEU PC ESTA LIMPO!
echo ===================================================
pause
