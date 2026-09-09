#!/bin/bash
clear
echo "========================================================================"
echo "                  ORBE CLEANER - MAC OS PROTOCOL"
echo "                    Deep System Sterilization v3.0"
echo "========================================================================"
echo "Este script solicitara privilegios de 'sudo' para purgar a RAM"
echo "inativa, limpar o Xcode, Simulator e destruir o SleepImage."
echo "========================================================================"
echo ""

sudo -v 

echo "[1/15] Purgando Library Caches (Sistema e Usuario)..."
sudo rm -rf ~/Library/Caches/* >/dev/null 2>&1
sudo rm -rf /Library/Caches/* >/dev/null 2>&1

echo "[2/15] Esvaziando Lixeiras (Trashes) Brutamente..."
sudo rm -rf ~/.Trash/* >/dev/null 2>&1
sudo rm -rf /Volumes/*/.Trashes/* >/dev/null 2>&1

echo "[3/15] Destruindo Derived Data e Archives do Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* >/dev/null 2>&1
rm -rf ~/Library/Developer/Xcode/Archives/* >/dev/null 2>&1

echo "[4/15] Varrendo Simuladores iOS Base (Libera ate 20GB+)..."
xcrun simctl delete unavailable >/dev/null 2>&1
rm -rf ~/Library/Developer/CoreSimulator/Devices/* >/dev/null 2>&1
rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/* >/dev/null 2>&1

echo "[5/15] Limpando Docker (Imagens, Volumes Ocultos e Builder Cache)..."
docker system prune -a --volumes -f >/dev/null 2>&1
docker builder prune -a -f >/dev/null 2>&1

echo "[6/15] Varrendo Caches NPM, Yarn e Pip..."
npm cache clean --force >/dev/null 2>&1
yarn cache clean >/dev/null 2>&1
pip cache purge >/dev/null 2>&1
pip3 cache purge >/dev/null 2>&1

echo "[7/15] Destruindo Caches Maven (.m2), Gradle e Android Studio..."
rm -rf ~/.m2/repository/* >/dev/null 2>&1
rm -rf ~/.gradle/caches/* >/dev/null 2>&1
rm -rf ~/.android/cache/* >/dev/null 2>&1

echo "[8/15] Limpando Cache do Homebrew..."
brew cleanup -s >/dev/null 2>&1
rm -rf $(brew --cache) >/dev/null 2>&1

echo "[9/15] Removendo Logs Gigantes e Diagnostic Reports..."
sudo rm -rf /private/var/log/* >/dev/null 2>&1
sudo rm -rf /Library/Logs/DiagnosticReports/* >/dev/null 2>&1

echo "[10/15] Limpando Cache de DNS (mDNSResponder)..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo "[11/15] Purgando Memoria RAM Inativa, Swap e SleepImage..."
sudo rm -f /private/var/vm/sleepimage >/dev/null 2>&1
sudo purge >/dev/null 2>&1

echo "[12/15] Forcando Otimizacao do Spotlight..."
sudo mdutil -E / >/dev/null 2>&1

echo ""
echo "========================================================================"
echo "    [ SUCESSO ] SISTEMA ESTERILIZADO. ATE 30+ GIGABYTES RECUPERADOS."
echo "========================================================================"
