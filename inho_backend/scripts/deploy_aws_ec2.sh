#!/usr/bin/env bash
# ====================================================================
# INHO Platform — AWS EC2 Production Zero-Downtime Deploy & Rollback Script
# ====================================================================

set -e

APP_DIR="/home/ubuntu/orbe-systems/inho_backend"
HEALTH_CHECK_URI="/health"
IMAGE_TAG="inho-backend:latest"
PREVIOUS_TAG="inho-backend:previous"
NGINX_CONTAINER="inho-nginx"

echo "🚀 Iniciando Implantação Zero-Downtime Blue/Green na AWS EC2..."
mkdir -p "$APP_DIR/nginx"

cd "$APP_DIR" || exit 1

# 1. Determina a cor atual
if docker ps --format '{{.Names}}' | grep -q 'inho-backend-blue'; then
    OLD_COLOR="blue"
    OLD_PORT=8001
    NEW_COLOR="green"
    NEW_PORT=8002
else
    OLD_COLOR="green"
    OLD_PORT=8002
    NEW_COLOR="blue"
    NEW_PORT=8001
fi

NEW_CONTAINER="inho-backend-$NEW_COLOR"
OLD_CONTAINER="inho-backend-$OLD_COLOR"

echo "🔄 Deploying $NEW_COLOR environment (Port: $NEW_PORT)..."

# 2. Compilar e Subir o novo contêiner
echo "🔨 Usando Imagem ECR Monolítica (Bypass Docker Build) + Montagem Local..."
IMAGE_TAG="982534388133.dkr.ecr.us-east-1.amazonaws.com/orbe-systems-api:latest"

docker rm -f "$NEW_CONTAINER" 2>/dev/null || true
docker run -d \
    --name "$NEW_CONTAINER" \
    --restart always \
    --user root \
    -p $NEW_PORT:8000 \
    --env-file .env \
    -v "$APP_DIR:/workspace" \
    -w "/workspace" \
    "$IMAGE_TAG" \
    sh -c "apt-get update && apt-get install -y ca-certificates || true; pip install -q -r requirements.txt || pip install -q --break-system-packages -r requirements.txt || true; uvicorn main:app --host 0.0.0.0 --port 8000"

# 3. Health Check pós-deploy na nova instância
HEALTH_CHECK_URL="http://localhost:$NEW_PORT$HEALTH_CHECK_URI"
echo "🩺 Executando Health Check HTTP na API ($HEALTH_CHECK_URL)..."
HEALTH_PASSED=false
for i in {1..60}; do
    if curl -s -f "$HEALTH_CHECK_URL" >/dev/null; then
        HEALTH_PASSED=true
        echo "✅ Health Check Aprovado (HTTP 200 OK em ${i}s)!"
        break
    fi
    sleep 1
done

# 4. Rollback Instantâneo (se falhar, apenas descartamos o novo contêiner)
if [ "$HEALTH_PASSED" = false ]; then
    echo "❌ FALHA NO HEALTH CHECK! Logs do container em falha:"
    docker logs --tail 60 "$NEW_CONTAINER"
    echo "Acionando Rollback..."
    docker rm -f "$NEW_CONTAINER" || true
    echo "⏪ O tráfego continua sendo servido normalmente pelo ambiente $OLD_COLOR ($OLD_CONTAINER)."
    exit 1
fi

echo "🌐 Atualizando config nativa do Nginx para apontar inho-api para $NEW_COLOR (porta $NEW_PORT)..."

# 5. Configurar e rotear NGINX Nativo
sudo cat <<EOF > /etc/nginx/sites-available/default
# Main API (orbe_backend)
server {
    listen 80;
    server_name api.orbesystems.com.br;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}

# INHO API (inho_backend)
server {
    listen 80;
    server_name inho-api.orbesystems.com.br;

    location / {
        proxy_pass http://localhost:$NEW_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

sudo systemctl reload nginx || sudo systemctl restart nginx
echo "⚡ Recarregando config do Nginx Nativo (Zero Downtime reload)..."

# 6. Desligar contêiner antigo com segurança
docker rm -f "$NGINX_CONTAINER" 2>/dev/null || true

# 6. Desligar contêiner antigo com segurança
if docker ps -a --format '{{.Names}}' | grep -q "$OLD_CONTAINER"; then
    echo "🛑 Desligando ambiente antigo ($OLD_COLOR)..."
    OLD_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$OLD_CONTAINER")
    docker tag "$OLD_IMAGE_ID" "$PREVIOUS_TAG" || true
    docker rm -f "$OLD_CONTAINER"
fi

echo "🎉 Implantação Zero-Downtime concluída com sucesso na AWS EC2!"
