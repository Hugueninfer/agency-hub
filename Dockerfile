# ============================================================
# 1. BUILD — React (Vite)
# ============================================================
FROM node:22-alpine AS react-build

WORKDIR /app/web
COPY web/ .

RUN npm ci && npm run build

# ============================================================
# 2. BUILD — Laravel (PHP + Composer)
# ============================================================
FROM php:8.4-fpm-alpine@sha256:49734670eccf414af884c2a0c2e558401e228615f8028f1c9fca30a0d4fb1bc2 AS laravel-build

# PHP extensions (icu-libs pro intl)
RUN apk add --no-cache \
    libpng-dev libjpeg-turbo-dev freetype-dev \
    libzip-dev icu-dev icu-libs oniguruma-dev \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install -j$(nproc) \
    pdo pdo_mysql mbstring gd zip intl bcmath opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY api/ .

RUN COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

COPY --from=react-build /app/web/dist /app/public

# NAO cachear config no build: as env vars (APP_KEY, DB_*) ainda nao existem.
# config:cache roda em runtime no start.sh, com o ambiente ja disponivel.
RUN php artisan route:cache && \
    php artisan view:cache && \
    php artisan event:cache

# ============================================================
# 3. FINAL — PHP (com Nginx instalado dentro)
# ============================================================
FROM php:8.4-fpm-alpine@sha256:49734670eccf414af884c2a0c2e558401e228615f8028f1c9fca30a0d4fb1bc2

# Nginx + gettext (envsubst) + bash (debug) + libs de RUNTIME das extensoes PHP
# (icu-libs=intl, libpng/libjpeg/freetype=gd, libzip=zip, oniguruma=mbstring)
RUN apk add --no-cache nginx gettext bash supervisor curl tini \
    icu-libs libpng libjpeg-turbo freetype libzip oniguruma

# Extensoes PHP compiladas no estagio de build (pdo_mysql, gd, intl, zip, bcmath...)
# A imagem base so traz pdo_sqlite/opcache; sem isto o MySQL da "could not find driver".
COPY --from=laravel-build /usr/local/lib/php/extensions /usr/local/lib/php/extensions
COPY --from=laravel-build /usr/local/etc/php/conf.d /usr/local/etc/php/conf.d

# Laravel
COPY --from=laravel-build /app /app

# Força PHP-FPM a usar TCP (não socket Unix) para compatibilidade com nginx
RUN sed -i 's/^listen = .*/listen = 127.0.0.1:9000/' /usr/local/etc/php-fpm.d/www.conf 2>/dev/null; \
    if ! grep -q 'listen = 127.0.0.1:9000' /usr/local/etc/php-fpm.d/www.conf; then \
      printf '[www]\nlisten = 127.0.0.1:9000\n' > /usr/local/etc/php-fpm.d/zz-docker.conf; \
    fi

# Nginx config
RUN rm -f /etc/nginx/http.d/default.conf && mkdir -p /etc/nginx/http.d
COPY nginx.conf /etc/nginx/http.d/default.conf

WORKDIR /app

# Supervisord config (gerencia php-fpm + nginx + queue-worker)
COPY supervisord.conf /etc/supervisord.conf
COPY docker/supervisor-watchdog.py /usr/local/bin/supervisor-watchdog.py

# Script de entrada (arquivo separado para evitar quoting bugs)
COPY start.sh /start.sh
RUN chmod +x /start.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl --fail --silent --output /dev/null "http://127.0.0.1:${PORT:-80}/api/health" || exit 1

# Reap child processes and let the watchdog terminate supervisord with a
# nonzero status. Namespace PID 1 cannot be SIGKILLed by its own children.
ENTRYPOINT ["/sbin/tini", "--", "docker-php-entrypoint"]
CMD ["/start.sh"]
