# 🚀 CHV RiskInsight — Sistema de Gestión de Riesgos Corporativos

> Plataforma SaaS multi-tenant para identificación, evaluación, mitigación y auditoría de riesgos empresariales con predicción asistida por inteligencia artificial.

<div align="center">

![CI](https://github.com/chvmix79/evidence-shield-sys/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-291%20passed-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## 📌 Descripción

**CHV RiskInsight** es una aplicación web empresarial diseñada para gestionar el ciclo completo de **todo tipo de riesgos corporativos**, adaptándose al sector de cada organización (operacionales, financieros, legales, tecnológicos, ambientales, laborales, entre otros). Compatible con múltiples estándares y normativas (ISO 27001, ISO 31000, SG-SST, y más). Permite a organizaciones de cualquier tamaño centralizar la gestión de riesgos, planes de acción, evidencias y auditorías en una única plataforma segura.

El sistema opera como **SaaS multi-tenant**, donde cada organización accede únicamente a sus datos mediante aislamiento por empresa con Row Level Security (RLS) a nivel de base de datos.

---

## 🎯 Objetivo

| Problema | Solución |
|----------|----------|
| Gestión de riesgos en hojas de cálculo dispersas | Plataforma centralizada con dashboard en tiempo real |
| Sin trazabilidad de acciones correctivas | Módulo de acciones con estados, responsables y fechas |
| Auditorías manuales sin estándar | Sistema de auditorías con checklists por normativa |
| Análisis reactivo de riesgos | Predicción proactiva con IA (Google Gemini) |
| Sin control de acceso a la información | RBAC + RLS + MFA por usuario |

---

## 🧩 Funcionalidades Principales

### Módulos Operativos

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real, score global de riesgo, gráficos interactivos |
| **Empresas** | Gestión multi-empresa con sectores y niveles de riesgo |
| **Riesgos** | CRUD completo con matriz probabilidad × impacto, plantillas por sector |
| **Acciones** | Planes de acción con responsables, fechas y estados |
| **Evidencias** | Upload de archivos con Storage, vinculación a riesgos |
| **Alertas** | Centro de notificaciones con tipos (overload, critical) |
| **Reportes** | Generación de PDF y Excel con jsPDF y xlsx |
| **Inventario** | Gestión de activos de información |

### Módulos Avanzados

| Módulo | Descripción |
|--------|-------------|
| **Auditorías** | Programación, ejecución y hallazgos con checklists |
| **Predicción IA** | Análisis predictivo de riesgos con Google Gemini 1.5 Flash |
| **Webhooks** | Integración con sistemas externos vía HTTP |
| **SuperAdmin** | Panel de administración global, gestión de usuarios y roles |
| **Audit Logs** | Trazabilidad completa de acciones (quién, qué, cuándo) |
| **Upload Externo** | Portal para proveedores externos (sin login) |

### Características Transversales

- 🌐 Internacionalización (Español / Inglés)
- 🌙 Tema oscuro / claro
- 📱 Diseño responsive
- 🔐 Autenticación MFA (TOTP)
- 👥 Roles: superadmin, admin, auditor, user

---

## 🏗️ Arquitectura (Resumen)

El sistema utiliza una arquitectura de **Monolito Modular con Backend-as-a-Service**:

```
┌──────────────────────────────────────────────┐
│  FRONTEND        React 18 + Vite + TypeScript │
│                  shadcn/ui + Tailwind CSS     │
│                  React Query (cache)          │
├──────────────────────────────────────────────┤
│  BACKEND         Supabase SDK (directo)       │
│                  Express API (server/)        │
│                  Edge Functions (Deno)        │
├──────────────────────────────────────────────┤
│  DATA            PostgreSQL (Supabase)        │
│                  RLS + Auth + Storage         │
├──────────────────────────────────────────────┤
│  EXTERNAL        Google Gemini (IA)           │
│                  Webhooks + Email SMTP        │
└──────────────────────────────────────────────┘
```

> 📎 Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para la documentación completa de arquitectura.

---

## 📂 Estructura del Proyecto

```
RIESGOS/
├── src/                        # Código fuente frontend
│   ├── components/             # Componentes reutilizables
│   │   ├── ui/                 # Primitivos shadcn/ui (Button, Dialog, etc.)
│   │   ├── ai/                 # Componentes de IA (RiskPredictionDashboard)
│   │   ├── admin/              # Componentes administrativos (TemplateManager)
│   │   └── audits/             # Componentes de auditoría
│   ├── pages/                  # Vistas completas (una por ruta)
│   ├── contexts/               # Estado global (AuthContext, CompanyContext)
│   ├── hooks/                  # Custom hooks reutilizables
│   ├── lib/                    # Utilidades y helpers
│   ├── integrations/supabase/  # Cliente tipado + tipos auto-generados
│   └── test/                   # Tests unitarios
│
├── server/                     # Backend Express (API REST)
│   ├── api.ts                  # Endpoints REST + middleware auth
│   ├── emails.ts               # Servicio de email
│   └── webhooks.ts             # Dispatching de webhooks
│
├── supabase/                   # Infraestructura Supabase
│   ├── functions/chat-ai/      # Edge Function para chat IA
│   └── migrations/             # Migraciones SQL versionadas
│
└── Documentación
    ├── README.md               # Este archivo
    ├── ARCHITECTURE.md         # Arquitectura detallada
    ├── SECURITY.md             # Política de seguridad
    ├── TESTING.md              # Plan de pruebas
    ├── AGEND.md                # Reglas para agentes IA
    └── ROADMAP.md              # Plan de desarrollo
```

---

## ⚙️ Tecnologías Utilizadas

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 18.3 | Biblioteca UI |
| TypeScript | 5.8 | Tipado estático |
| Vite | 5.4 | Bundler y dev server |
| Tailwind CSS | 3.4 | Framework de estilos |
| shadcn/ui + Radix | Latest | Sistema de componentes |
| React Query | 5.x | Cache y estado de servidor |
| React Router | 6.x | Enrutamiento SPA |
| React Hook Form + Zod | Latest | Formularios con validación |
| Recharts | 2.x | Gráficos interactivos |
| i18next | 25.x | Internacionalización |
| jsPDF + exceljs | Latest | Exportación de reportes (PDF + Excel) |

### Backend

| Tecnología | Propósito |
|-----------|-----------|
| Supabase (PostgreSQL) | Base de datos, Auth, Storage, RLS |
| Express 5 | API REST auxiliar |
| Google Gemini 1.5 Flash | Predicción de riesgos con IA |
| Supabase Edge Functions | Funciones serverless (Deno) |

### Testing

| Tecnología | Propósito |
|-----------|-----------|
| Vitest | Tests unitarios y de integración |
| Playwright | Tests end-to-end |
| Testing Library | Utilidades para testing de React |

---

## 🔐 Seguridad

El sistema implementa un modelo de **defensa en profundidad** con 5 capas:

| Capa | Mecanismo |
|------|-----------|
| **Autenticación** | Supabase Auth con JWT + MFA (TOTP) |
| **Autorización** | RBAC con 4 roles (superadmin, admin, auditor, user) |
| **Aislamiento** | Row Level Security por `owner_id` y `company_id` |
| **Validación** | Zod en frontend + CHECK constraints en PostgreSQL |
| **Auditoría** | `audit_logs` con IP, usuario, acción y diff de datos |

### Reglas Críticas de Seguridad

- ❌ Nunca exponer API keys en el frontend
- ❌ Nunca commitear `.env` al repositorio
- ✅ Variables `VITE_*` son las únicas accesibles desde `src/`
- ✅ RLS activo en todas las tablas con datos sensibles

> 📎 Ver [SECURITY.md](./SECURITY.md) para la política completa de seguridad.

---

## 🚀 Instalación

### Requisitos Previos

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (o **bun**)
- Cuenta en **Supabase** con proyecto configurado
- (Opcional) API key de **Google Gemini** para funcionalidades de IA

### Paso a Paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-organizacion/riesgos.git
cd riesgos

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de tu proyecto Supabase

# 4. Ejecutar migraciones (si es primera vez)
# Ejecutar los archivos en supabase/migrations/ en orden en el SQL Editor de Supabase

# 5. Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```bash
# .env
VITE_SUPABASE_PROJECT_ID=tu-project-id
VITE_SUPABASE_URL=https://tu-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key

# Solo para server/ (opcional)
GEMINI_API_KEY=tu-api-key-de-gemini
WEBHOOK_SECRET=tu-webhook-secret
```

---

## ▶️ Uso

### Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo (puerto 8080) |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run test` | Ejecuta tests unitarios — **291 tests, 30 archivos** |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run api` | Inicia el servidor Express (puerto 3001) |
| `npm run api:dev` | Servidor Express con hot reload |

### Acceso al Sistema

1. Navegar a `http://localhost:8080`
2. Registrarse o iniciar sesión
3. Seleccionar empresa (o crear una nueva)
4. Navegar por los módulos del sidebar

---

## 🔄 Flujo de Trabajo

### Para Desarrolladores

```
1. Crear branch desde main    →  feature/nombre-descriptivo
2. Implementar cambios        →  Cambios pequeños e incrementales
3. Ejecutar tests             →  npm run test
4. Revisar lint               →  npm run lint
5. Crear Pull Request         →  Con descripción del cambio e impacto
6. Code review                →  Mínimo 1 aprobación
7. Merge a main               →  Solo si tests pasan al 100%
```

### Reglas del Flujo

- Seguir las instrucciones de [AGEND.md](./AGEND.md) para desarrollo asistido por IA
- No hacer cambios destructivos sin análisis de impacto
- Validar funcionalidades existentes después de cada cambio
- Documentar decisiones técnicas relevantes

---

## 🧪 Pruebas

### Ejecución

```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:coverage

# Tests E2E
npm run test:e2e
```

### Qué se Prueba

| Área | Tipo de Test |
|------|-------------|
| Contexts (Auth, Company) | Unitario |
| Hooks y utilidades | Unitario |
| Flujos de usuario | E2E (Playwright) |
| Componentes aislados | Integración (Testing Library) |

> 📎 Ver [TESTING.md](./TESTING.md) para el plan de pruebas completo.

---

## 📦 Despliegue

### Pre-Despliegue (Checklist)

```
□  Ejecutar npm run test — todos los tests pasan
□  Ejecutar npm run build — build exitoso sin errores
□  Verificar variables de entorno de producción
□  Ejecutar fix_rls_policies.sql en Supabase (si hay cambios)
□  Verificar cuota de API Gemini
□  Revisar npm audit — sin vulnerabilidades críticas
```

### Build de Producción

```bash
npm run build
# Output en /dist — listo para servir desde CDN o hosting estático
```

### Hosting Recomendado

| Componente | Plataforma |
|-----------|-----------|
| Frontend (SPA) | Vercel, Netlify, o cualquier hosting estático |
| Base de datos | Supabase (managed PostgreSQL) |
| API Express | Railway, Render, o VPS |
| Edge Functions | Supabase Functions (integrado) |

---

## 📈 Estado del Proyecto

| Aspecto | Estado |
|---------|--------|
| **Fase actual** | ✅ Producción-Ready (v1.2.0) |
| **Módulos core** | ✅ Completados y estables |
| **Testing** | ✅ 291 tests, 30 archivos (Vitest + Playwright) |
| **Seguridad** | ✅ RLS + RBAC + MFA implementados |
| **IA** | ✅ Predicción con Gemini operativa |
| **i18n** | ✅ Español e Inglés |

---

## 🛣️ Roadmap

El plan de desarrollo detallado se encuentra en [ROADMAP.md](./ROADMAP.md).

### Próximas Funcionalidades (Backlog)

- 📱 App Móvil (React Native) para captura de evidencias
- 🔔 Notificaciones Push (Web Push API)
- 📊 Dashboard personalizable con widgets configurables
- 🔗 Integración SAML/SSO para identidad externa
- 🤖 Auditorías automatizadas con programación

---

## 👨‍💻 Autor / Equipo

| Rol | Responsable |
|-----|-------------|
| **Desarrollo & Arquitectura** | Equipo CHV |
| **Infraestructura** | Supabase (BaaS) |
| **IA / ML** | Google Gemini API |

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License**.

Ver el archivo [LICENSE](./LICENSE) para más detalles.

---

## ⚠️ Notas Importantes

### Reglas Críticas del Proyecto

| # | Regla |
|---|-------|
| 1 | **No romper funcionalidad existente** — Cualquier cambio debe ser validado contra módulos existentes |
| 2 | **No commitear secrets** — El archivo `.env` nunca debe llegar al repositorio |
| 3 | **Cambios incrementales** — Modificaciones pequeñas, controladas y reversibles |
| 4 | **Tests obligatorios** — No hacer merge sin que todos los tests pasen |
| 5 | **RLS siempre activo** — Toda tabla nueva debe tener políticas de seguridad |

### Aislamiento del Proyecto

> ⚠️ Este proyecto opera exclusivamente con el Supabase Project ID `plekrenflycwjludkrxb`. No mezclar credenciales, schemas ni configuraciones con otros proyectos.

---

## 🤖 Uso de IA

Este proyecto integra inteligencia artificial en dos niveles:

### 1. IA como Funcionalidad (Google Gemini)

- Predicción y análisis de riesgos corporativos
- Chat asistido para consultas sobre normativas
- Generación de recomendaciones basadas en datos

### 2. IA como Herramienta de Desarrollo

El desarrollo asistido por IA debe seguir reglas estrictas:

- 📋 Seguir las instrucciones de [AGEND.md](./AGEND.md)
- 🔍 Analizar impacto antes de implementar cualquier cambio
- ✅ Validar que funcionalidades existentes no se rompan
- 🛡️ Nunca generar código que comprometa la seguridad
- 📝 Explicar cambios antes de ejecutarlos

> **Prioridad del agente IA:** Seguridad > Estabilidad > Calidad > Velocidad

---

## 📚 Documentación Complementaria

| Documento | Propósito |
|-----------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura técnica detallada del sistema |
| [SECURITY.md](./SECURITY.md) | Política de seguridad y protocolos |
| [TESTING.md](./TESTING.md) | Plan de pruebas y criterios de validación |
| [AGEND.md](./AGEND.md) | Reglas obligatorias para agentes de IA |
| [ROADMAP.md](./ROADMAP.md) | Plan de desarrollo y estado de módulos |

---

> **CHV RiskInsight** — Gestión inteligente de riesgos corporativos  
> Versión 1.2.0 · Producción-Ready · Mayo 2026