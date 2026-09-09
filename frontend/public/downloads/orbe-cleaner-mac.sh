#!/bin/bash
echo "==================================================="
echo "            ORBE CLEANER - MAC OS PROTOCOL"
echo "              Deep System Sterilization"
echo "==================================================="
echo "OBS: Este script apagará APENAS arquivos temporarios,"
echo "cache npm, containers docker sem uso e a lixeira."
echo "Nenhum arquivo de projeto ou banco de dados vivo sera tocado."
echo "==================================================="
read -p "Pressione [Enter] para iniciar..."

echo ""
echo "[1/5] Purgando Library Caches do Sistema..."
sudo rm -rf ~/Library/Caches/* >/dev/null 2>&1

echo "[2/5] Limpando Cache Global do NPM..."
npm cache clean --force >/dev/null 2>&1

echo "[3/5] Limpando Docker (Imagens e Containers Abandonados)..."
docker system prune -a -f >/dev/null 2>&1

echo "[4/5] Esvaziando Trash (Lixeira) Local..."
rm -rf ~/.Trash/* >/dev/null 2>&1
sudo rm -rf /Volumes/*/.Trashes >/dev/null 2>&1

echo "[5/5] Limpando Cache de DNS..."
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

echo ""
echo "==================================================="
echo "    ESTERILIZACAO COMPLETA. SEU MAC ESTA LIMPO!"
echo "==================================================="
