# Flame Assistant - Standalone

Una aplicación standalone de Flame Assistant para prototipado y desarrollo sin conexión a backend.

## Características

- **Landing Page**: Página principal sin redirecciones automáticas
- **Dashboard**: Información actual del sistema con estadísticas
- **Navegación**: Sistema de navegación interno sin routing externo
- **Tema**: Soporte para modo claro y oscuro
- **Responsive**: Diseño adaptativo para móvil y desktop

## Páginas Disponibles

- **Landing**: Página principal con CTA para acceder al dashboard
- **Dashboard**: Resumen del sistema con estadísticas y actividad reciente
- **Inbox**: Work in Progress - Gestión de conversaciones
- **Contactos**: Work in Progress - Gestión de contactos
- **Documentos**: Work in Progress - Biblioteca de documentos
- **Asistentes**: Work in Progress - Configuración de bots IA
- **Integraciones**: Work in Progress - Conexiones externas
- **Configuración**: Work in Progress - Ajustes del sistema

## Instalación

```bash
cd @new_flame_assistant
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5175`

## Construcción

```bash
npm run build
```

## Tecnologías

- React 18
- TypeScript
- Tailwind CSS
- Lucide React (iconos)
- Vite

## Estructura

```
src/
├── components/          # Componentes reutilizables
├── contexts/           # Contextos de React
├── layouts/            # Layouts de la aplicación
├── pages/              # Páginas de la aplicación
│   ├── dashboard/      # Dashboard principal
│   ├── inbox/          # Gestión de conversaciones
│   ├── contacts/       # Gestión de contactos
│   ├── documents/      # Biblioteca de documentos
│   ├── assistants/     # Configuración de asistentes
│   ├── integrations/   # Integraciones externas
│   └── settings/       # Configuración del sistema
├── utils/              # Utilidades
└── assets/             # Recursos estáticos
```

## Notas

- Esta es una versión standalone sin conexión a backend
- Perfecta para prototipado y desarrollo de UI/UX
- Todas las páginas excepto Dashboard muestran "Work in Progress"
- El sistema de navegación es interno usando contextos de React
