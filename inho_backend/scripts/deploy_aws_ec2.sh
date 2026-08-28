#!/usr/bin/env bash
# ====================================================================
# INHO Platform — AWS EC2 Production Zero-Downtime Deploy & Rollback Script
# ====================================================================

set -e

APP_DIR="/opt/orbe-systems/inho_backend"
HEALTH_CHECK_URI="/api/v1/health"
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

# 2. Subir o novo contêiner sem derrubar o atual
docker rm -f "$NEW_CONTAINER" 2>/dev/null || true
docker run -d \
    --name "$NEW_CONTAINER" \
    --restart always \
    -p $NEW_PORT:8000 \
    --env-file .env \
    "$IMAGE_TAG"

# 3. Health Check pós-deploy na nova instância
HEALTH_CHECK_URL="http://localhost:$NEW_PORT$HEALTH_CHECK_URI"
echo "🩺 Executando Health Check HTTP na API ($HEALTH_CHECK_URL)..."
HEALTH_PASSED=false
for i in {1..15}; do
    if curl -s -f "$HEALTH_CHECK_URL" >/dev/null; then
        HEALTH_PASSED=true
        echo "✅ Health Check Aprovado (HTTP 200 OK em ${i}s)!"
        break
    fi
    sleep 1
done

# 4. Rollback Instantâneo (se falhar, apenas descartamos o novo contêiner)
if [ "$HEALTH_PASSED" = false ]; then
    echo "❌ FALHA NO HEALTH CHECK! Acionando Rollback..."
    docker rm -f "$NEW_CONTAINER" || true
    echo "⏪ O tráfego continua sendo servido normalmente pelo ambiente $OLD_COLOR ($OLD_CONTAINER)."
    exit 1
fi

echo "🌐 Atualizando rota do Nginx para apontar para $NEW_COLOR (porta $NEW_PORT)..."

# 5. Configurar e rotear via Nginx
cat <<EOF > "$APP_DIR/nginx/nginx.conf"
worker_processes auto;
events {
    worker_connections 1024;
}
http {
    upstream inho_api {
        server 127.0.0.1:$NEW_PORT;
    }

    server {
        listen 80;
        
        # Oculta informações do Nginx
        server_tokens off;

        location / {
            proxy_pass http://inho_api;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

# Inicia ou atualiza o proxy Nginx
if ! docker ps --format '{{.Names}}' | grep -q "^$NGINX_CONTAINER$"; then
    docker rm -f "$NGINX_CONTAINER" 2>/dev/null || true
    echo "🚀 Iniciando proxy Nginx pela primeira vez..."
    docker run -d --name "$NGINX_CONTAINER" --restart always --network host -v "$APP_DIR/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine
else
    echo "⚡ Recarregando config do Nginx (Zero Downtime reload)..."
    docker cp "$APP_DIR/nginx/nginx.conf" "$NGINX_CONTAINER":/etc/nginx/nginx.conf
    docker exec "$NGINX_CONTAINER" nginx -s reload
fi

# 6. Desligar contêiner antigo com segurança
if docker ps -a --format '{{.Names}}' | grep -q "$OLD_CONTAINER"; then
    echo "🛑 Desligando ambiente antigo ($OLD_COLOR)..."
    OLD_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$OLD_CONTAINER")
    docker tag "$OLD_IMAGE_ID" "$PREVIOUS_TAG" || true
    docker rm -f "$OLD_CONTAINER"
fi

echo "🎉 Implantação Zero-Downtime concluída com sucesso na AWS EC2!"
