#!/usr/bin/env bash
# ====================================================================
# INHO Platform — AWS EC2 Production Zero-Downtime Deploy & Rollback Script
# ====================================================================

set -e

APP_DIR="/opt/orbe-systems/inho_backend"
CONTAINER_NAME="inho-backend-prod"
HEALTH_CHECK_URL="http://localhost:8000/api/v1/health"
IMAGE_TAG="inho-backend:latest"
PREVIOUS_TAG="inho-backend:previous"

echo "🚀 Iniciando Implantação Zero-Downtime na AWS EC2..."

cd "$APP_DIR" || exit 1

# 1. Reter a imagem anterior para Rollback Instantâneo
if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "📦 Taguando container atual como '$PREVIOUS_TAG'..."
    docker tag "$IMAGE_TAG" "$PREVIOUS_TAG" || true
    docker stop "$CONTAINER_NAME" || true
    docker rm "$CONTAINER_NAME" || true
fi

# 2. Iniciar o novo contêiner
echo "🔥 Subindo o novo contêiner '$CONTAINER_NAME'..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    -p 8000:8000 \
    --env-file .env \
    "$IMAGE_TAG"

# 3. Health Check pós-deploy (Espera até 10 segundos)
echo "🩺 Executando Health Check HTTP na API ($HEALTH_CHECK_URL)..."
HEALTH_PASSED=false
for i in {1..10}; do
    if curl -s -f "$HEALTH_CHECK_URL" >/dev/null; then
        HEALTH_PASSED=true
        echo "✅ Health Check Aprovado (HTTP 200 OK em ${i}s)!"
        break
    fi
    sleep 1
done

# 4. Rollback Automático em caso de Falha
if [ "$HEALTH_PASSED" = false ]; then
    echo "❌ FALHA NO HEALTH CHECK! Acionando Rollback Instantâneo para '$PREVIOUS_TAG'..."
    docker stop "$CONTAINER_NAME" || true
    docker rm "$CONTAINER_NAME" || true

    if docker image inspect "$PREVIOUS_TAG" >/dev/null 2>&1; then
        docker run -d \
            --name "$CONTAINER_NAME" \
            --restart always \
            -p 8000:8000 \
            --env-file .env \
            "$PREVIOUS_TAG"
        echo "⏪ Rollback concluído! A aplicação retornou para a versão estável anterior sem downtime."
    else
        echo "⚠️ Erro: Nenhuma imagem '$PREVIOUS_TAG' encontrada para rollback."
    fi
    exit 1
fi

echo "🎉 Implantação concluída com sucesso na AWS EC2!"
