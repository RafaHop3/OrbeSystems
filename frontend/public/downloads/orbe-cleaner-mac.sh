#!/bin/bash
clear
echo "========================================================================"
echo "                  ORBE CLEANER - MAC OS PROTOCOL"
echo "                    Deep System Sterilization v2.0"
echo "========================================================================"
echo "Este script solicitara privilegios de 'sudo' para purgar a RAM"
echo "inativa, limpar o Xcode e forcar a lixeira do sistema."
echo "========================================================================"
echo ""

sudo -v 

echo "[1/10] Purgando Library Caches (Sistema e Usuario)..."
sudo rm -rf ~/Library/Caches/* >/dev/null 2>&1
sudo rm -rf /Library/Caches/* >/dev/null 2>&1

echo "[2/10] Esvaziando Lixeiras (Trashes) Brutamente..."
sudo rm -rf ~/.Trash/* >/dev/null 2>&1
sudo rm -rf /Volumes/*/.Trashes/* >/dev/null 2>&1

echo "[3/10] Destruindo Derived Data do Xcode & Caches de Simuladores iOS..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* >/dev/null 2>&1
rm -rf ~/Library/Developer/Xcode/Archives/* >/dev/null 2>&1
xcrun simctl delete unavailable >/dev/null 2>&1

echo "[4/10] Limpando Docker (Imagens, Volumes Ocultos e Builder Cache)..."
docker system prune -a --volumes -f >/dev/null 2>&1
docker builder prune -a -f >/dev/null 2>&1

echo "[5/10] Varrendo Caches de NPM, Yarn e Pip..."
npm cache clean --force >/dev/null 2>&1
yarn cache clean >/dev/null 2>&1
pip cache purge >/dev/null 2>&1
pip3 cache purge >/dev/null 2>&1

echo "[6/10] Limpando Cache do Homebrew..."
brew cleanup -s >/dev/null 2>&1
rm -rf $(brew --cache) >/dev/null 2>&1

echo "[7/10] Removendo Logs Gigantes do Sistema..."
sudo rm -rf /private/var/log/* >/dev/null 2>&1
sudo rm -rf /Library/Logs/DiagnosticReports/* >/dev/null 2>&1

echo "[8/10] Limpando Cache de DNS..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo "[9/10] Purgando Memoria RAM Inativa / Swap..."
sudo purge >/dev/null 2>&1

echo "[10/10] Forcando Otimizacao do Spotlight..."
sudo mdutil -E / >/dev/null 2>&1

echo ""
echo "========================================================================"
echo "    [ SUCESSO ] SISTEMA ESTERILIZADO. GIGABYTES RECUPERADOS."
echo "========================================================================"
