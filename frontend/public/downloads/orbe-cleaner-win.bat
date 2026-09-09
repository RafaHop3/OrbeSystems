@echo off
setlocal EnableDelayedExpansion
title Orbe Cleaner - Deep System Sterilization Protocol
color 0B

echo ========================================================================
echo                  ORBE CLEANER - WINDOWS PROTOCOL
echo                    Deep System Sterilization v2.0
echo ========================================================================
echo O script ira solicitar privilegios de Administrador para acessar 
echo pastas profundas do Windows (como Prefetch e SoftwareDistribution).
echo ========================================================================
echo.

:: Check Admin Rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privilegios de Administrador confirmados.
) else (
    echo [ERRO] Este script precisa ser executado como Administrador para limpeza profunda.
    echo Por favor, clique com o botao direito no arquivo e selecione "Executar como Administrador".
    pause
    exit /b
)

echo.
echo [1/10] Purgando Windows TEMP...
del /q /f /s %TEMP%\* >nul 2>&1
rd /s /q %TEMP% >nul 2>&1
md %TEMP% >nul 2>&1
del /q /f /s C:\Windows\Temp\* >nul 2>&1
rd /s /q C:\Windows\Temp >nul 2>&1
md C:\Windows\Temp >nul 2>&1

echo [2/10] Esvaziando Lixeira do Sistema (Agressivo)...
rd /s /q %systemdrive%\$Recycle.bin >nul 2>&1
rd /s /q D:\$Recycle.bin >nul 2>&1
rd /s /q E:\$Recycle.bin >nul 2>&1

echo [3/10] Limpando Cache do Windows Update (SoftwareDistribution)...
net stop wuauserv >nul 2>&1
del /q /f /s C:\Windows\SoftwareDistribution\Download\* >nul 2>&1
net start wuauserv >nul 2>&1

echo [4/10] Limpando Arquivos Prefetch...
del /q /f /s C:\Windows\Prefetch\* >nul 2>&1

echo [5/10] Esvaziando Cache do Docker (Imagens/Containers/Volumes Abandonados)...
docker system prune -a --volumes -f >nul 2>&1
docker builder prune -a -f >nul 2>&1

echo [6/10] Varrendo Caches de Desenvolvimento (NPM, Yarn, Pip, NuGet)...
call npm cache clean --force >nul 2>&1
call yarn cache clean >nul 2>&1
pip cache purge >nul 2>&1
dotnet nuget locals all --clear >nul 2>&1

echo [7/10] Removendo Caches Inuteis do VS Code...
del /q /f /s "%APPDATA%\Code\Cache\*" >nul 2>&1
del /q /f /s "%APPDATA%\Code\CachedData\*" >nul 2>&1
del /q /f /s "%APPDATA%\Code\Code Cache\*" >nul 2>&1

echo [8/10] Limpando DNS e Logs do Sistema (Event Viewer)...
ipconfig /flushdns >nul 2>&1
for /F "tokens=*" %%G in ('wevtutil.exe el') DO (call wevtutil.exe cl "%%G" >nul 2>&1)

echo [9/10] Limpando Arquivos da Area de Transferencia...
echo off | clip

echo [10/10] Forcando Limpeza de Diretivas de Rede...
ipconfig /release >nul 2>&1
ipconfig /renew >nul 2>&1

echo.
echo ========================================================================
echo    [ SUCESSO ] SISTEMA ESTERILIZADO. GIGABYTES RECUPERADOS.
echo ========================================================================
pause
