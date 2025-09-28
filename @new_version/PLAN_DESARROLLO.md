# 📋 Plan Completo de Desarrollo - Análisis Comparativo

## **🔍 Estado Actual vs Estado Deseado**

### **1. MÓDULO DE INTEGRACIONES** 
**Estado Actual: ✅ 80% Completo**

| Funcionalidad | Estado Actual | Estado Deseado | Cambios Necesarios |
|---------------|---------------|----------------|-------------------|
| **WhatsApp Web** | ✅ Conecta y desconecta | ✅ Funcional | Ninguno |
| **Web Chat** | ✅ Widget funcional | ✅ Funcional | Ninguno |
| **Facebook/Instagram** | ❌ No implementado | 🔄 Próximamente | Agregar integraciones |
| **WhatsApp Business API** | ❌ No implementado | 🔄 Próximamente | Agregar integraciones |
| **Estado de conexiones** | ✅ Básico | ✅ Funcional | Ninguno |
| **Sincronización automática** | ❌ No implementado | 🔄 Necesario | Implementar |

**Cambios Requeridos:**
- ✅ Mantener funcionalidad actual
- 🔄 Agregar sincronización automática de contactos
- 🔄 Preparar estructura para nuevas integraciones

---

### **2. MÓDULO DE ASISTENTES**
**Estado Actual: ⚠️ 40% Completo**

| Funcionalidad | Estado Actual | Estado Deseado | Cambios Necesarios |
|---------------|---------------|----------------|-------------------|
| **CRUD Básico** | ✅ Funcional | ✅ Funcional | Ninguno |
| **Tipos de asistente** | ✅ Auto/IA | ✅ Funcional | Ninguno |
| **Configuración de horarios** | ✅ Básico | ✅ Funcional | Ninguno |
| **Integración con OpenAI** | ❌ No implementado | 🔄 Crítico | Implementar API |
| **Plantillas de respuestas** | ❌ No implementado | 🔄 Crítico | Crear sistema |
| **Asignación automática** | ❌ No implementado | 🔄 Crítico | Implementar lógica |
| **Respuestas automáticas** | ❌ No implementado | 🔄 Crítico | Conectar con inbox |
| **Entrenamiento con documentos** | ❌ No implementado | 🔄 Importante | Implementar |

**Cambios Requeridos:**
- 🔄 **CRÍTICO:** Implementar integración real con OpenAI
- 🔄 **CRÍTICO:** Crear sistema de plantillas de respuestas
- 🔄 **CRÍTICO:** Implementar lógica de asignación automática
- 🔄 **CRÍTICO:** Conectar respuestas automáticas con inbox
- 🔄 **IMPORTANTE:** Sistema de entrenamiento con documentos

---

### **3. MÓDULO DE INBOX**
**Estado Actual: ⚠️ 60% Completo**

| Funcionalidad | Estado Actual | Estado Deseado | Cambios Necesarios |
|---------------|---------------|----------------|-------------------|
| **Vista de conversaciones** | ✅ Funcional | ✅ Funcional | Ninguno |
| **Mensajes en tiempo real** | ✅ Socket.IO | ✅ Funcional | Ninguno |
| **Filtros básicos** | ✅ Estado/Prioridad | ✅ Funcional | Ninguno |
| **Asignación de asistentes** | ❌ No implementado | 🔄 Crítico | Implementar |
| **Etiquetas y categorización** | ❌ No implementado | 🔄 Importante | Crear sistema |
| **Historial por contacto** | ❌ No implementado | 🔄 Importante | Implementar |
| **Búsqueda avanzada** | ❌ Básica | 🔄 Importante | Mejorar |
| **Notificaciones** | ❌ No implementado | 🔄 Importante | Implementar |

**Cambios Requeridos:**
- 🔄 **CRÍTICO:** Mostrar asistente asignado en cada conversación
- 🔄 **CRÍTICO:** Implementar asignación manual/automática
- 🔄 **IMPORTANTE:** Sistema de etiquetas
- 🔄 **IMPORTANTE:** Historial de conversaciones por contacto
- 🔄 **IMPORTANTE:** Notificaciones en tiempo real

---

### **4. MÓDULO DE CONTACTOS**
**Estado Actual: ⚠️ 50% Completo**

| Funcionalidad | Estado Actual | Estado Deseado | Cambios Necesarios |
|---------------|---------------|----------------|-------------------|
| **CRUD Básico** | ✅ Funcional | ✅ Funcional | Ninguno |
| **Sincronización WhatsApp** | ✅ Básica | ✅ Funcional | Ninguno |
| **Filtros por tipo** | ✅ Individual/Grupo | ✅ Funcional | Ninguno |
| **Creación automática** | ❌ No implementado | 🔄 Crítico | Implementar |
| **Historial de interacciones** | ❌ No implementado | 🔄 Crítico | Implementar |
| **Notas por contacto** | ❌ No implementado | 🔄 Importante | Implementar |
| **Segmentación** | ❌ No implementado | 🔄 Importante | Implementar |
| **Estadísticas** | ❌ No implementado | 🔄 Importante | Implementar |

**Cambios Requeridos:**
- 🔄 **CRÍTICO:** Creación automática desde mensajes entrantes
- 🔄 **CRÍTICO:** Historial completo de interacciones
- 🔄 **IMPORTANTE:** Sistema de notas
- 🔄 **IMPORTANTE:** Segmentación de contactos

---

## **🗄️ BASE DE DATOS - Cambios Necesarios**

### **Tablas Existentes (✅ Mantener)**
```sql
-- Estas tablas están bien y solo necesitan pequeños ajustes
users ✅
whatsapp_sessions ✅  
contacts ✅ (necesita campos adicionales)
messages ✅
scheduled_messages ✅
assistants ✅ (necesita campos adicionales)
web_visitors ✅
web_conversations ✅
web_messages ✅
```

### **Nuevas Tablas Requeridas (🆕 Crear)**

```sql
-- 1. Asignaciones de asistentes a conversaciones
CREATE TABLE assistant_assignments (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    assignment_type VARCHAR(50) DEFAULT 'automatic' -- 'automatic', 'manual'
);

-- 2. Plantillas de respuestas
CREATE TABLE response_templates (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    trigger_keywords TEXT[],
    conditions JSONB, -- Condiciones específicas
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sistema de etiquetas
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Etiquetas de conversaciones
CREATE TABLE conversation_tags (
    conversation_id VARCHAR(255) NOT NULL,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, tag_id)
);

-- 5. Historial de interacciones
CREATE TABLE interaction_history (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'message', 'call', 'meeting'
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notas de contactos
CREATE TABLE contact_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Configuración de asistentes
CREATE TABLE assistant_configs (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, config_key)
);
```

### **Modificaciones a Tablas Existentes (🔄 Actualizar)**

```sql
-- Agregar campos a la tabla contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_interaction TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;

-- Agregar campos a la tabla assistants
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gpt-3.5-turbo';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 150;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS temperature DECIMAL(2,1) DEFAULT 0.7;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT TRUE;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS response_delay INTEGER DEFAULT 0; -- segundos

-- Agregar campos a la tabla messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS assistant_id INTEGER REFERENCES assistants(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_auto_response BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES response_templates(id);
```

---

## **🔄 FLUJO CORRELATIVO - Implementación**

### **Flujo Actual (❌ Roto)**
```
Mensaje llega → Se muestra en inbox → Usuario responde manualmente
```

### **Flujo Deseado (✅ Completo)**
```
Mensaje llega → 
  ├── Crear/actualizar contacto automáticamente
  ├── Asignar asistente (automático o manual)
  ├── Verificar si asistente debe responder
  ├── Generar respuesta automática (si aplica)
  ├── Enviar respuesta
  └── Registrar en historial
```

---

## **📅 PLAN DE IMPLEMENTACIÓN DETALLADO**

### **FASE 1: Base de Datos (Semana 1)**
**Prioridad: 🔴 CRÍTICA**

| Día | Tarea | Archivos a Modificar | Tiempo Estimado |
|-----|-------|---------------------|-----------------|
| 1 | Crear nuevas tablas | `scripts/init-db.sql` | 4 horas |
| 2 | Modificar tablas existentes | `scripts/init-db.sql` | 2 horas |
| 3 | Crear migraciones | `scripts/migrate-*.sql` | 3 horas |
| 4 | Actualizar tipos TypeScript | `backend/src/types/index.ts` | 2 horas |
| 5 | Probar migraciones | Base de datos | 2 horas |

### **FASE 2: Backend - Servicios (Semana 2)**
**Prioridad: 🔴 CRÍTICA**

| Día | Tarea | Archivos a Crear/Modificar | Tiempo Estimado |
|-----|-------|---------------------------|-----------------|
| 1 | Servicio de Asignación | `backend/src/services/AssignmentService.ts` | 6 horas |
| 2 | Servicio de Plantillas | `backend/src/services/TemplateService.ts` | 4 horas |
| 3 | Servicio de Etiquetas | `backend/src/services/TagService.ts` | 4 horas |
| 4 | Integración OpenAI | `backend/src/services/OpenAIService.ts` | 6 horas |
| 5 | Lógica de Respuestas Automáticas | `backend/src/services/AutoResponseService.ts` | 8 horas |

### **FASE 3: Backend - Controladores (Semana 3)**
**Prioridad: 🔴 CRÍTICA**

| Día | Tarea | Archivos a Crear/Modificar | Tiempo Estimado |
|-----|-------|---------------------------|-----------------|
| 1 | Controlador de Asignaciones | `backend/src/controllers/AssignmentController.ts` | 4 horas |
| 2 | Controlador de Plantillas | `backend/src/controllers/TemplateController.ts` | 4 horas |
| 3 | Controlador de Etiquetas | `backend/src/controllers/TagController.ts` | 4 horas |
| 4 | Actualizar WhatsAppController | `backend/src/controllers/WhatsAppController.ts` | 6 horas |
| 5 | Actualizar AssistantsController | `backend/src/controllers/AssistantsController.ts` | 6 horas |

### **FASE 4: Frontend - Componentes (Semana 4)**
**Prioridad: 🟡 IMPORTANTE**

| Día | Tarea | Archivos a Crear/Modificar | Tiempo Estimado |
|-----|-------|---------------------------|-----------------|
| 1 | Componente de Asignación | `frontend/src/components/AssistantAssignment.tsx` | 6 horas |
| 2 | Componente de Plantillas | `frontend/src/components/TemplateManager.tsx` | 6 horas |
| 3 | Componente de Etiquetas | `frontend/src/components/TagManager.tsx` | 4 horas |
| 4 | Actualizar InboxPage | `frontend/src/pages/inbox/InboxPage.tsx` | 8 horas |
| 5 | Actualizar AssistantsPage | `frontend/src/pages/assistants/AssistantsPage.tsx` | 6 horas |

### **FASE 5: Integración y Testing (Semana 5)**
**Prioridad: 🟡 IMPORTANTE**

| Día | Tarea | Archivos a Modificar | Tiempo Estimado |
|-----|-------|---------------------|-----------------|
| 1 | Integrar servicios con WhatsApp | `backend/src/services/WhatsAppService.ts` | 6 horas |
| 2 | Actualizar Socket.IO events | `backend/src/server.ts` | 4 horas |
| 3 | Testing de flujo completo | Varios archivos | 8 horas |
| 4 | Debugging y correcciones | Varios archivos | 6 horas |
| 5 | Documentación | `README.md` | 4 horas |

### **FASE 6: Mejoras de UX/UI (Semana 6)**
**Prioridad: 🟢 OPCIONAL**

| Día | Tarea | Archivos a Crear/Modificar | Tiempo Estimado |
|-----|-------|---------------------------|-----------------|
| 1 | Notificaciones en tiempo real | `frontend/src/hooks/useNotifications.ts` | 6 horas |
| 2 | Búsqueda avanzada | `frontend/src/components/AdvancedSearch.tsx` | 6 horas |
| 3 | Dashboard de estadísticas | `frontend/src/pages/dashboard/DashboardPage.tsx` | 8 horas |
| 4 | Mejoras visuales | Varios componentes | 6 horas |
| 5 | Optimizaciones | Varios archivos | 4 horas |

---

## **📊 RESUMEN DE CAMBIOS**

### **Archivos a Crear (🆕 15 archivos)**
- `backend/src/services/AssignmentService.ts`
- `backend/src/services/TemplateService.ts`
- `backend/src/services/TagService.ts`
- `backend/src/services/OpenAIService.ts`
- `backend/src/services/AutoResponseService.ts`
- `backend/src/controllers/AssignmentController.ts`
- `backend/src/controllers/TemplateController.ts`
- `backend/src/controllers/TagController.ts`
- `frontend/src/components/AssistantAssignment.tsx`
- `frontend/src/components/TemplateManager.tsx`
- `frontend/src/components/TagManager.tsx`
- `frontend/src/hooks/useNotifications.ts`
- `frontend/src/components/AdvancedSearch.tsx`
- `scripts/migrate-assignments.sql`
- `scripts/migrate-templates.sql`

### **Archivos a Modificar (🔄 12 archivos)**
- `scripts/init-db.sql` - Agregar nuevas tablas
- `backend/src/types/index.ts` - Nuevos tipos
- `backend/src/controllers/WhatsAppController.ts` - Integrar asignaciones
- `backend/src/controllers/AssistantsController.ts` - Agregar plantillas
- `backend/src/services/WhatsAppService.ts` - Respuestas automáticas
- `backend/src/server.ts` - Nuevos eventos Socket.IO
- `frontend/src/pages/inbox/InboxPage.tsx` - Mostrar asignaciones
- `frontend/src/pages/assistants/AssistantsPage.tsx` - Gestión de plantillas
- `frontend/src/pages/contacts/ContactsPage.tsx` - Historial de interacciones
- `frontend/src/services/api.service.ts` - Nuevas APIs
- `frontend/src/contexts/AppContext.tsx` - Nuevos estados
- `README.md` - Documentación actualizada

### **Tiempo Total Estimado: 120 horas (3 semanas a tiempo completo)**

---

## **🚀 PRÓXIMOS PASOS**

1. **Revisar y aprobar este plan**
2. **Comenzar con Fase 1: Base de Datos**
3. **Configurar entorno de desarrollo**
4. **Implementar migraciones de base de datos**
5. **Desarrollar servicios backend**
6. **Integrar con frontend**
7. **Testing y debugging**
8. **Deploy y documentación**

---

## **📝 NOTAS DE DESARROLLO**

- Mantener compatibilidad con funcionalidades existentes
- Implementar cambios de forma incremental
- Testing continuo en cada fase
- Documentar todos los cambios
- Backup de base de datos antes de migraciones

---

**Última actualización:** $(date)
**Versión del plan:** 1.0
**Estado:** En desarrollo
