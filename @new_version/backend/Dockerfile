# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para Baileys
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copiar package files
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Crear directorios necesarios con permisos correctos
RUN mkdir -p data sessions logs && \
    chown -R node:node data sessions logs

# Cambiar a usuario node por seguridad
USER node

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/whatsapp_manager.db
ENV WHATSAPP_SESSION_PATH=/app/sessions
ENV JWT_SECRET=whatsapp-manager-docker-secret-2024
ENV JWT_EXPIRES_IN=7d
ENV CORS_ORIGIN=http://localhost
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]
