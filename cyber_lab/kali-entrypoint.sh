#!/usr/bin/env bash
set -euo pipefail

mkdir -p /root/.ssh /var/run/sshd
chmod 700 /root/.ssh

if [ -n "${ORBE_IPHONE_SSH_PUBKEY:-}" ]; then
  printf '%s\n' "$ORBE_IPHONE_SSH_PUBKEY" > /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  echo "[OrbeCyberLab] Chave pública Ed25519 injetada em /root/.ssh/authorized_keys."
else
  echo "[OrbeCyberLab] AVISO: ORBE_IPHONE_SSH_PUBKEY não definida; crie/injete uma chave Ed25519 antes de conectar." >&2
fi

ssh-keygen -A >/dev/null 2>&1 || true

exec /usr/sbin/sshd -D -e
