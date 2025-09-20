# 🚀 Flame Assistant - Instrucciones de Uso

## ✅ Estado Actual
**¡La aplicación está 100% funcional!** Todos los servicios están corriendo correctamente.

## 🌐 Acceso a la Aplicación

### Frontend (Interfaz de Usuario)
- **URL**: http://localhost:5173
- **Estado**: ✅ Funcionando

### Backend (API)
- **URL**: http://localhost:3000
- **Estado**: ✅ Funcionando

## 🔐 Credenciales de Acceso

### Usuario Administrador
- **Email**: `admin@flame.com`
- **Contraseña**: `flame123`
- **Rol**: Administrador

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Script Automático (Recomendado)
```bash
./start.sh
```

### Opción 2: Docker Compose Manual
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver estado de los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 🔧 Servicios Disponibles

| Servicio | Puerto | Estado | Descripción |
|----------|--------|--------|-------------|
| Frontend | 5173 | ✅ | Interfaz React |
| Backend | 3000 | ✅ | API Node.js |
| PostgreSQL | 5432 | ✅ | Base de datos |
| Redis | 6379 | ✅ | Cache y sesiones |

## 📱 Funcionalidades Disponibles

- ✅ **Autenticación completa** (login, registro, logout)
- ✅ **Dashboard** con métricas
- ✅ **Gestión de conversaciones**
- ✅ **Gestión de asistentes**
- ✅ **WebSocket** para tiempo real
- ✅ **Base de datos PostgreSQL** con esquema completo
- ✅ **Cache Redis** para mejor rendimiento

## 🧪 Probar la Aplicación

1. **Abrir el navegador** en http://localhost:5173
2. **Hacer clic en "Iniciar Sesión"**
3. **Ingresar las credenciales**:
   - Email: `admin@flame.com`
   - Contraseña: `flame123`
4. **¡Disfrutar de la aplicación!**

## 🔍 Verificar Estado de Servicios

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Ver logs del backend
docker-compose logs backend

# Ver logs del frontend
docker-compose logs frontend

# Ver logs de la base de datos
docker-compose logs postgres
```

## 🛠️ Comandos Útiles

```bash
# Reiniciar un servicio específico
docker-compose restart backend

# Reconstruir un servicio
docker-compose up -d --build backend

# Ver uso de recursos
docker stats

# Limpiar contenedores y volúmenes
docker-compose down -v
docker system prune -a
```

## 🆘 Solución de Problemas

### Si el frontend no carga:
```bash
docker-compose restart frontend
```

### Si el backend no responde:
```bash
docker-compose restart backend
```

### Si la base de datos no conecta:
```bash
docker-compose restart postgres
```

### Ver logs de errores:
```bash
docker-compose logs --tail=50
```

## 📊 Monitoreo

- **Health Check Backend**: http://localhost:3000/health
- **Estado de servicios**: `docker-compose ps`
- **Logs en tiempo real**: `docker-compose logs -f`

---

**¡La aplicación está lista para usar! 🎉**

Para cualquier problema, revisar los logs con `docker-compose logs -f`
