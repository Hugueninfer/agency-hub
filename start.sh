#!/bin/sh
# Fail closed before serving traffic if configuration or migrations fail.
set -eu
cd /app

php -r '$key = getenv("APP_KEY") ?: ""; if (!str_starts_with($key, "base64:") || strlen(base64_decode(substr($key, 7), true) ?: "") !== 32) { fwrite(STDERR, "[start] APP_KEY must be a base64-prefixed 32-byte key.\n"); exit(1); }'
/usr/local/bin/bootstrap-aiven-ca.sh

echo "[start] Starting container..."

# Volume persistente monta vazio em /app/storage, sobrescrevendo a estrutura
# que vinha na imagem — recria as pastas que o Laravel espera encontrar
mkdir -p /app/storage/app/public /app/storage/app/private \
  /app/storage/framework/cache/data /app/storage/framework/sessions \
  /app/storage/framework/testing /app/storage/framework/views \
  /app/storage/logs

# Permissões do storage — www-data precisa escrever logs e sessões
chown -R www-data:www-data /app/storage /app/bootstrap/cache
chmod -R 775 /app/storage /app/bootstrap/cache

# Cacheia config AGORA, com APP_KEY/DB_* ja disponiveis (build nao tinha env)
echo "[start] Caching config com env de runtime..."
php artisan config:clear
php artisan config:cache

php artisan migrate --force --quiet

# Link storage/app/public -> public/storage (nao versionado, precisa recriar a cada deploy)
if [ ! -e /app/public/storage ]; then
  echo "[start] Criando storage:link..."
  php artisan storage:link
fi

echo "[start] Setting PORT..."
export PORT="${PORT:-80}"
case "$PORT" in
  ''|*[!0-9]*) echo '[start] PORT must be numeric.' >&2; exit 1 ;;
esac
envsubst '$PORT' < /etc/nginx/http.d/default.conf > /etc/nginx/http.d/default.conf.tmp
mv /etc/nginx/http.d/default.conf.tmp /etc/nginx/http.d/default.conf
echo "[start] PORT set to $PORT"

echo "[start] Testing nginx config..."
nginx -t

echo "[start] Starting supervisord (php-fpm + nginx + queue-worker)..."
exec supervisord -c /etc/supervisord.conf
