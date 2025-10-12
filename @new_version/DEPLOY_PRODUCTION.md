# 🚀 Guía de Despliegue en Producción

Esta guía te ayudará a desplegar Flame AI en un servidor de producción (AWS EC2, DigitalOcean, etc.).

## ⚡ Inicio Rápido

### 1. Preparar el Servidor

```bash
# Conectar a tu servidor
ssh -i tu-key.pem ec2-user@tu-servidor.com

# Clonar el repositorio
git clone https://github.com/tu-usuario/flame-assistant.git
cd flame-assistant/@new_version

# Hacer ejecutable el script de despliegue
chmod +x deploy-production.sh
```

### 2. Desplegar

```bash
# Despliegue normal
./deploy-production.sh

# Despliegue con limpieza completa (si hay problemas)
./deploy-production.sh --clean
```

### 3. Verificar

```bash
# Verificar estado
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Edita `docker-compose.prod.yml` para configurar:

```yaml
environment:
  - CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com
  - JWT_SECRET=tu-clave-super-secreta
  - DB_PASSWORD=tu-password-seguro
```

### Dominio Personalizado

1. **Configurar DNS**: Apunta tu dominio al IP del servidor
2. **Actualizar CORS**: Cambia `CORS_ORIGIN` en `docker-compose.prod.yml`
3. **Reiniciar**: `docker-compose -f docker-compose.prod.yml restart backend`

### SSL/HTTPS

Para habilitar HTTPS, necesitarás:

1. **Certificados SSL**: Obtén certificados de Let's Encrypt
2. **Nginx**: Configura Nginx como reverse proxy
3. **Actualizar CORS**: Incluir `https://` en `CORS_ORIGIN`

## 🐛 Troubleshooting

### Error de CORS

```bash
# Verificar configuración CORS
docker exec whatsapp-manager-backend env | grep CORS

# Debe mostrar: CORS_ORIGIN=https://tu-dominio.com
```

### Base de Datos No Inicializa

```bash
# Limpiar y recrear
docker-compose -f docker-compose.prod.yml down
docker volume rm new_version_postgres_data
docker-compose -f docker-compose.prod.yml up -d
```

### WhatsApp No Se Conecta

```bash
# Ver logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i whatsapp

# Limpiar sesiones
docker exec whatsapp-manager-backend rm -rf /app/sessions/*
```

## 📊 Monitoreo

### Comandos Útiles

```bash
# Estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Uso de recursos
docker stats

# Logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl -f http://localhost:3001/health
```

### Backup

```bash
# Backup de base de datos
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U whatsapp_user whatsapp_manager > backup.sql

# Backup de sesiones WhatsApp
docker cp whatsapp-manager-backend:/app/sessions ./backup-sessions
```

## 🔄 Actualizaciones

### Actualizar Código

```bash
# Obtener últimos cambios
git pull origin main

# Reconstruir y reiniciar
docker-compose -f docker-compose.prod.yml up --build -d
```

### Actualizar Base de Datos

```bash
# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## 🚨 Alertas Importantes

1. **Cambiar Contraseñas**: Nunca uses las contraseñas por defecto en producción
2. **Backup Regular**: Configura backups automáticos
3. **Monitoreo**: Configura alertas para caídas de servicio
4. **SSL**: Siempre usa HTTPS en producción
5. **Firewall**: Solo abre los puertos necesarios

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verifica la configuración: `docker-compose -f docker-compose.prod.yml config`
3. Consulta esta guía de troubleshooting
4. Abre un issue en GitHub

---

**¡Despliegue exitoso! 🎉**
