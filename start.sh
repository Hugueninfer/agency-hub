#!/bin/sh
# Start script for Railway
set -e

echo "[start] Starting container..."

# Volume persistente monta vazio em /app/storage, sobrescrevendo a estrutura
# que vinha na imagem — recria as pastas que o Laravel espera encontrar
mkdir -p /app/storage/app/public /app/storage/app/private \
  /app/storage/framework/cache/data /app/storage/framework/sessions \
  /app/storage/framework/testing /app/storage/framework/views \
  /app/storage/logs

# Permissões do storage — www-data precisa escrever logs e sessões
chown -R www-data:www-data /app/storage /app/bootstrap/cache 2>/dev/null || true
chmod -R 775 /app/storage /app/bootstrap/cache 2>/dev/null || true

# Cacheia config AGORA, com APP_KEY/DB_* ja disponiveis (build nao tinha env)
echo "[start] Caching config com env de runtime..."
php artisan config:clear 2>&1 || true
php artisan config:cache 2>&1 || echo "[start] config:cache falhou"

php artisan migrate --force --quiet 2>&1 || echo "[start] Migrate skipped"

# Link storage/app/public -> public/storage (nao versionado, precisa recriar a cada deploy)
if [ ! -e /app/public/storage ]; then
  echo "[start] Criando storage:link..."
  php artisan storage:link 2>&1 || echo "[start] storage:link falhou"
fi

echo "[start] Setting PORT..."
export PORT="${PORT:-80}"
envsubst '$PORT' < /etc/nginx/http.d/default.conf > /etc/nginx/http.d/default.conf.tmp
mv /etc/nginx/http.d/default.conf.tmp /etc/nginx/http.d/default.conf
echo "[start] PORT set to $PORT"

echo "[start] Testing nginx config..."
nginx -t 2>&1 || echo "[start] nginx config test failed"

echo "[start] Starting supervisord (php-fpm + nginx + queue-worker)..."
exec supervisord -c /etc/supervisord.conf
