# 🚀 Scripts de Gestión - Flame AI

## 📋 Scripts Disponibles

### 1. `start.sh` - Iniciar la aplicación
Inicia la aplicación en modo desarrollo o producción con migraciones automáticas.

**Uso:**
```bash
# Modo desarrollo (por defecto)
./start.sh
./start.sh --dev

# Modo producción
./start.sh --prod
./start.sh --production

# Ayuda
./start.sh --help
```

**Características:**
- ✅ Detección automática de Docker y Docker Compose
- ✅ Creación automática de directorios necesarios
- ✅ Construcción de contenedores con cache limpio
- ✅ Migraciones automáticas de PostgreSQL
- ✅ Verificación de salud de servicios
- ✅ Creación de usuario por defecto
- ✅ Soporte para desarrollo y producción

### 2. `stop.sh` - Detener la aplicación
Detiene todos los servicios de la aplicación.

**Uso:**
```bash
# Modo desarrollo (por defecto)
./stop.sh
./stop.sh --dev

# Modo producción
./stop.sh --prod
./stop.sh --production

# Ayuda
./stop.sh --help
```

**Características:**
- ✅ Detención limpia de contenedores
- ✅ Preservación de datos persistentes
- ✅ Soporte para desarrollo y producción

### 3. `clean.sh` - Limpiar completamente
Elimina todos los datos, contenedores e imágenes (¡CUIDADO!).

**Uso:**
```bash
# Modo desarrollo (por defecto)
./clean.sh
./clean.sh --dev

# Modo producción
./clean.sh --prod
./clean.sh --production

# Ayuda
./clean.sh --help
```

**Características:**
- ⚠️ Eliminación completa de datos
- ⚠️ Confirmación requerida antes de ejecutar
- ✅ Limpieza de imágenes Docker huérfanas
- ✅ Soporte para desarrollo y producción

## 🔧 Configuración de Entornos

### Modo Desarrollo (`docker-compose.yml`)
- **Frontend**: http://localhost
- **Backend**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **CORS**: http://localhost

### Modo Producción (`docker-compose.prod.yml`)
- **Frontend**: http://localhost
- **Backend**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **CORS**: * (todos los orígenes)

## 🗄️ Migraciones de Base de Datos

Las migraciones se ejecutan automáticamente al iniciar la aplicación:

1. **Verificación**: Se verifica si las tablas ya existen
2. **Migración**: Si no existen, se ejecuta el script de inicialización
3. **Usuario por defecto**: Se crea automáticamente si no existe
4. **Verificación final**: Se confirma que todo está funcionando

### Usuario por Defecto
- **Email**: admin@flame.com
- **Contraseña**: flame123

## 📊 Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo PostgreSQL
docker-compose logs -f postgres
```

### Ver estado de contenedores
```bash
docker-compose ps
```

### Acceder a la base de datos
```bash
# Modo desarrollo
docker-compose exec postgres psql -U whatsapp_user -d whatsapp_manager

# Modo producción
docker-compose -f docker-compose.prod.yml exec postgres psql -U whatsapp_user -d whatsapp_manager
```

### Ejecutar migración manual
```bash
# Modo desarrollo
docker-compose exec backend npm run migrate

# Modo producción
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## 🚨 Solución de Problemas

### Error: "Docker no está instalado"
```bash
# Instalar Docker Desktop
# https://docs.docker.com/get-docker/
```

### Error: "Docker no está ejecutándose"
```bash
# Iniciar Docker Desktop
# Verificar: docker info
```

### Error: "Puerto ya en uso"
```bash
# Verificar qué está usando el puerto
lsof -i :80
lsof -i :3001
lsof -i :5432

# Detener servicios conflictivos
./stop.sh
```

### Error: "Migración falló"
```bash
# Ver logs de PostgreSQL
docker-compose logs postgres

# Ejecutar migración manual
docker-compose exec backend npm run migrate

# O migración SQL directa
docker-compose exec -T postgres psql -U whatsapp_user -d whatsapp_manager < backend/scripts/init-db.sql
```

### Error: "Backend no responde"
```bash
# Ver logs del backend
docker-compose logs backend

# Reiniciar solo el backend
docker-compose restart backend

# O reiniciar todo
./stop.sh && ./start.sh
```

## 📁 Estructura de Datos

Los datos se almacenan en:
```
./docker-data/
├── backend/          # Base de datos PostgreSQL
├── sessions/         # Sesiones de WhatsApp
└── logs/            # Logs del sistema
```

## 🔄 Flujo de Trabajo Recomendado

### Desarrollo
```bash
# Iniciar
./start.sh

# Desarrollar...

# Detener
./stop.sh
```

### Producción
```bash
# Iniciar
./start.sh --prod

# Monitorear
docker-compose -f docker-compose.prod.yml logs -f

# Detener
./stop.sh --prod
```

### Limpieza completa
```bash
# ⚠️ CUIDADO: Esto elimina TODOS los datos
./clean.sh

# Reiniciar desde cero
./start.sh
```

## 📝 Notas Importantes

1. **Datos persistentes**: Los datos se mantienen entre reinicios
2. **Migraciones**: Se ejecutan automáticamente al iniciar
3. **Puertos**: Asegúrate de que los puertos estén libres
4. **Docker**: Debe estar ejecutándose antes de usar los scripts
5. **Permisos**: Los scripts son ejecutables por defecto

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs: `docker-compose logs`
2. Verifica el estado: `docker-compose ps`
3. Consulta este README
4. Reinicia los servicios: `./stop.sh && ./start.sh`
