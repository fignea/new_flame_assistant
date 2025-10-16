# Backend Dockerfile
FROM node:20-alpine as base

WORKDIR /app

# Instalar dependencias del sistema necesarias para Baileys y PostgreSQL
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
    freetype-dev \
    postgresql-client

# Copiar package files
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY . .

# Etapa de desarrollo
FROM base as development

# Variables de entorno para desarrollo
ENV NODE_ENV=development
ENV PORT=3001
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=flame_assistant_dev
ENV DB_USER=flame_user
ENV DB_PASSWORD=flame_password
ENV REDIS_URL=redis://redis:6379
ENV WHATSAPP_SESSION_PATH=/app/sessions
ENV JWT_SECRET=flame-assistant-dev-jwt-key-2024
ENV JWT_EXPIRES_IN=7d
ENV CORS_ORIGIN=http://localhost:3000
ENV LOG_LEVEL=debug

# Crear directorios necesarios con permisos correctos
RUN mkdir -p data sessions logs uploads uploads/thumbnails && \
    chown -R node:node data sessions logs uploads

# Hacer ejecutable el script de migración
RUN chmod +x scripts/migrate-database.js

# Cambiar a usuario node por seguridad
USER node

# Exponer puerto
EXPOSE 3001

# Comando de desarrollo
CMD ["npm", "run", "dev"]

# Etapa de producción
FROM base as production

# Compilar TypeScript
RUN npm run build

# Crear directorios necesarios con permisos correctos
RUN mkdir -p data sessions logs uploads uploads/thumbnails && \
    chown -R node:node data sessions logs uploads

# Hacer ejecutable el script de migración
RUN chmod +x scripts/migrate-database.js

# Cambiar a usuario node por seguridad
USER node

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=flame_assistant
ENV DB_USER=flame_user
ENV DB_PASSWORD=flame_password
ENV REDIS_URL=redis://redis:6379
ENV WHATSAPP_SESSION_PATH=/app/sessions
ENV JWT_SECRET=flame-assistant-docker-secret-2024
ENV JWT_EXPIRES_IN=7d
ENV CORS_ORIGIN=http://localhost
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Comando de inicio
CMD ["npm", "start"]