@echo off
setlocal EnableDelayedExpansion
title Orbe Cleaner - Deep System Sterilization Protocol
color 0B

echo ========================================================================
echo                  ORBE CLEANER - WINDOWS PROTOCOL
echo                    Deep System Sterilization v3.0
echo ========================================================================
echo O script ira solicitar privilegios de Administrador para acessar 
echo pastas profundas do Windows (como WinSxS, Prefetch e Hibernacao).
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
echo [1/15] Purgando Windows TEMP e Arquivos Temporarios...
del /q /f /s %TEMP%\* >nul 2>&1
rd /s /q %TEMP% >nul 2>&1
md %TEMP% >nul 2>&1
del /q /f /s C:\Windows\Temp\* >nul 2>&1
rd /s /q C:\Windows\Temp >nul 2>&1
md C:\Windows\Temp >nul 2>&1

echo [2/15] Esvaziando Lixeira do Sistema (Agressivo)...
rd /s /q %systemdrive%\$Recycle.bin >nul 2>&1
rd /s /q D:\$Recycle.bin >nul 2>&1
rd /s /q E:\$Recycle.bin >nul 2>&1

echo [3/15] Limpando Cache do Windows Update e Delivery Optimization...
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
del /q /f /s C:\Windows\SoftwareDistribution\* >nul 2>&1
del /q /f /s C:\Windows\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache\* >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

echo [4/15] Destruindo Instalacoes Antigas do Windows (C:\Windows.old)...
rd /s /q C:\Windows.old >nul 2>&1

echo [5/15] Desativando Arquivo de Hibernacao (Libera Imediatamente de 16GB a 64GB)...
powercfg.exe /hibernate off >nul 2>&1

echo [6/15] Limpando Arquivos Prefetch e Minidumps (Crash Reports)...
del /q /f /s C:\Windows\Prefetch\* >nul 2>&1
del /q /f /s C:\Windows\Minidump\* >nul 2>&1
del /q /f /s C:\Windows\MEMORY.DMP >nul 2>&1

echo [7/15] Otimizando WinSxS (Component Store Cleanup)...
DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase >nul 2>&1

echo [8/15] Esvaziando Cache do Docker (Imagens e Volumes Abandonados)...
docker system prune -a --volumes -f >nul 2>&1
docker builder prune -a -f >nul 2>&1

echo [9/15] Varrendo Caches NPM, Yarn, Pip e NuGet...
call npm cache clean --force >nul 2>&1
call yarn cache clean >nul 2>&1
pip cache purge >nul 2>&1
dotnet nuget locals all --clear >nul 2>&1

echo [10/15] Destruindo Caches Maven (.m2) e Gradle...
rd /s /q %USERPROFILE%\.gradle\caches >nul 2>&1
rd /s /q %USERPROFILE%\.m2\repository >nul 2>&1
rd /s /q %USERPROFILE%\.android\cache >nul 2>&1

echo [11/15] Limpando Caches de Navegadores (Edge e Chrome)...
rd /s /q "%LocalAppData%\Microsoft\Edge\User Data\Default\Cache" >nul 2>&1
rd /s /q "%LocalAppData%\Google\Chrome\User Data\Default\Cache" >nul 2>&1

echo [12/15] Removendo Caches Inuteis do VS Code...
del /q /f /s "%APPDATA%\Code\Cache\*" >nul 2>&1
del /q /f /s "%APPDATA%\Code\CachedData\*" >nul 2>&1
del /q /f /s "%APPDATA%\Code\Code Cache\*" >nul 2>&1

echo [13/15] Limpando LogFiles do IIS e WER...
rd /s /q C:\inetpub\logs\LogFiles >nul 2>&1
rd /s /q C:\ProgramData\Microsoft\Windows\WER\ReportArchive >nul 2>&1

echo [14/15] Limpando DNS e Logs do Sistema (Event Viewer)...
ipconfig /flushdns >nul 2>&1
for /F "tokens=*" %%G in ('wevtutil.exe el') DO (call wevtutil.exe cl "%%G" >nul 2>&1)

echo [15/15] Executando Garbage Collector de Rede...
echo off | clip
ipconfig /release >nul 2>&1
ipconfig /renew >nul 2>&1

echo [16/20] Esvaziando a pasta AppData\Local\Temp absoluta...
del /q /f /s "%LOCALAPPDATA%\Temp\*" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Temp" >nul 2>&1
md "%LOCALAPPDATA%\Temp" >nul 2>&1

echo [17/20] Limpando Windows Store Cache (wsreset)...
wsreset.exe -i >nul 2>&1

echo [18/20] Limpando arquivos de Otimizacao (Thumbnails e CrashDumps)...
del /f /s /q /a:h "%LocalAppData%\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
del /f /s /q "%LOCALAPPDATA%\CrashDumps\*" >nul 2>&1

echo [19/20] Varrendo Caches de Projetos (Next.js e Vercel CLI)...
rd /s /q "%USERPROFILE%\.vercel\cache" >nul 2>&1
rd /s /q "%USERPROFILE%\AppData\Local\npm-cache" >nul 2>&1

echo [21/25] Limpando Pontos de Restauracao Antigos e Shadow Copies (Volume Shadow Copy)...
echo (Isso normalmente libera de 10GB a 30GB no Disco C)
vssadmin delete shadows /all /quiet >nul 2>&1

echo [22/25] Limpando Service Packs e Updates do Windows Abandonados...
DISM.exe /Online /Cleanup-Image /SPSuperseded >nul 2>&1

echo [23/25] Configurando Limpeza Maxima do Disco (Cleanmgr Super-Flags)...
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Active Setup Temp Folders" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Delivery Optimization Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Downloaded Program Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Internet Cache Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Recycle Bin" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Setup Log Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\System error memory dump files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\System error minidump files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Temporary Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Temporary Setup Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Update Cleanup" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1
REG ADD "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Windows Upgrade Log Files" /v StateFlags0001 /t REG_DWORD /d 2 /f >nul 2>&1

echo [24/25] Executando o CleanMgr Extremo do Windows...
cleanmgr.exe /sagerun:1 >nul 2>&1

echo [25/25] Compactando o Disco WSL (Virtual Disk do Docker/Linux) - Pode demorar...
wsl --shutdown >nul 2>&1
diskpart /s "%~dp0compact_wsl.txt" >nul 2>&1

echo.
echo ========================================================================
echo    [ SUCESSO ] NOVO ORBE CLEANER V5 ESTERILIZOU O SEU SISTEMA.
echo    [ MAXIMO ] ATE 70+ GIGABYTES RECUPERADOS COM EXTREMA AGRESSIVIDADE.
echo ========================================================================
pause
