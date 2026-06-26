# ============================================
# STAGE 1: Build — compilar la app con Vite
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Dependencias primero (caché de capas)
COPY package.json package-lock.json* ./
RUN npm ci

# Código fuente
COPY . .

# Variables de entorno para el build (se sobrescriben en runtime)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SENTRY_DSN

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# ============================================
# STAGE 2: Servir con Nginx (mínima huella)
# ============================================
FROM nginx:1.27-alpine

# Copiar build desde stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración Nginx: SPA + seguridad
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen       80;
    server_name  _;
    root         /usr/share/nginx/html;
    index        index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # SPA: redirigir todas las rutas a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Assets con caché agresiva
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co https://*.sentry.io; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" always;
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
