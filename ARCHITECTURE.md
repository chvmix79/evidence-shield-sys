# 🏗️ ARCHITECTURE.md — Arquitectura del Sistema

> **Proyecto:** CHV RiskInsight — Sistema de Gestión de Riesgos Corporativos  
> **Versión:** 1.0  
> **Última actualización:** 2026-05-04  
> **Autor:** Arquitectura de Software — Equipo CHV

---

## 📌 Contexto del Proyecto

CHV RiskInsight es una aplicación web empresarial SaaS multi-tenant para la gestión integral de **todo tipo de riesgos corporativos**, adaptable por sector (operacionales, financieros, legales, tecnológicos, ambientales, laborales, entre otros). Compatible con múltiples estándares y normativas (ISO 27001, ISO 31000, SG-SST, y más), con predicción asistida por inteligencia artificial (Google Gemini).

**Usuarios objetivo:** Empresas, auditores y administradores de riesgos.  
**Modelo de negocio:** SaaS con planes (Basic, Professional, Enterprise).  
**Infraestructura:** Supabase (PostgreSQL + Auth + Storage + Edge Functions) + Vite SPA + Express API.

---

## 🎯 Objetivo Arquitectónico

Diseñar una arquitectura **clara, modular y escalable** que:

- No rompa funcionalidades existentes al agregar nuevas
- Permita crecimiento horizontal del sistema (nuevos módulos, empresas, usuarios)
- Sea segura por diseño (RLS, MFA, RBAC)
- Sea mantenible a largo plazo con separación estricta de responsabilidades

---

## 🧩 1. Visión General de la Arquitectura

### Tipo: Monolito Modular con Backend-as-a-Service (BaaS)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Vite + React 18 + TypeScript SPA            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │  │
│  │  │Dashboard│ │ Risks   │ │ Audits  │ │ Reports   │  │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘  │  │
│  │       └───────────┼──────────┼─────────────┘        │  │
│  │              React Query (Cache Layer)                │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │ HTTPS                             │
├─────────────────────────┼───────────────────────────────────┤
│                    BACKEND LAYER                            │
│  ┌──────────────┐  ┌────┴───────────┐  ┌────────────────┐  │
│  │ Express API  │  │ Supabase SDK   │  │ Edge Functions │  │
│  │ (server/)    │  │ (Direct Client)│  │ (chat-ai)      │  │
│  └──────┬───────┘  └───────┬────────┘  └───────┬────────┘  │
│         └──────────────────┼───────────────────┘            │
│                            │                                │
├────────────────────────────┼────────────────────────────────┤
│                     DATA LAYER                              │
│  ┌─────────────────────────┴──────────────────────────┐     │
│  │              Supabase (PostgreSQL)                  │     │
│  │  ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────────┐  │     │
│  │  │  Auth  │ │ RLS  │ │Storage │ │  Migrations  │  │     │
│  │  └────────┘ └──────┘ └────────┘ └──────────────┘  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                  EXTERNAL SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Google Gemini│  │   Webhooks   │  │  Email (SMTP)  │    │
│  │  (AI/ML)     │  │  (Outbound)  │  │                │    │
│  └──────────────┘  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Justificación Técnica

| Decisión | Justificación |
|----------|---------------|
| **Monolito modular** | El equipo es pequeño. Microservicios añadirían complejidad operacional sin beneficio real en esta etapa. |
| **Supabase como BaaS** | Reduce la carga de mantener infraestructura propia (auth, DB, storage, realtime). PostgreSQL es maduro y confiable. |
| **React SPA + Vite** | Experiencia de usuario fluida con lazy loading por módulo. Vite ofrece HMR instantáneo y builds optimizados. |
| **Express API auxiliar** | Para lógica que no puede ejecutarse en el cliente (AI, agregaciones complejas, webhooks salientes). |
| **React Query** | Cache inteligente con stale-while-revalidate que reduce llamadas redundantes a Supabase. |

---

## 🏛️ 2. Capas del Sistema

### Capa de Presentación (UI)

| Responsabilidad | Implementación |
|-----------------|----------------|
| Renderizado de interfaz | React 18 + TypeScript |
| Sistema de diseño | shadcn/ui + Radix UI + Tailwind CSS |
| Enrutamiento | React Router DOM v6 |
| Estado global | React Context (Auth, Company) |
| Cache de datos | TanStack React Query v5 |
| Internacionalización | i18next |
| Notificaciones | Sonner + Toaster |
| Gráficos | Recharts |
| Exportación | jsPDF + xlsx |

**Regla:** La capa UI **nunca** contiene lógica de negocio ni acceso directo a la base de datos fuera del SDK de Supabase.

### Capa de Lógica de Negocio

| Responsabilidad | Ubicación |
|-----------------|-----------|
| Autenticación y autorización | `contexts/AuthContext.tsx` |
| Selección multi-empresa | `contexts/CompanyContext.tsx` |
| Validación de formularios | Zod schemas en cada página |
| Cálculos de riesgo | Inline en `RisksPage.tsx` (probabilidad × impacto) |
| Predicción IA | `server/api.ts` → Google Gemini |

**Regla:** Toda lógica reutilizable debe extraerse a `lib/` o `hooks/`. No duplicar cálculos entre componentes.

### Capa de Acceso a Datos

| Responsabilidad | Implementación |
|-----------------|----------------|
| Cliente tipado | `integrations/supabase/client.ts` con tipos generados |
| Tipos de BD | `integrations/supabase/types.ts` (auto-generado) |
| Queries seguras | `lib/supabaseSafe.ts` (wrapper con manejo de errores) |
| Migraciones | `supabase/migrations/*.sql` |
| RLS Policies | Definidas por tabla en PostgreSQL |

**Regla:** Toda interacción con datos pasa por el cliente tipado. Nunca queries raw sin tipado.

### Capa de Integraciones

| Servicio | Propósito | Ubicación |
|----------|-----------|-----------|
| Google Gemini 1.5 Flash | Predicción y análisis de riesgos con IA | `server/api.ts` |
| Supabase Edge Functions | Chat AI serverless | `supabase/functions/chat-ai/` |
| Webhooks salientes | Notificaciones a sistemas externos | `server/webhooks.ts` |
| Email SMTP | Alertas y notificaciones | `server/emails.ts` |

**Regla:** Las API keys de terceros **nunca** se exponen en el frontend. Solo en `server/` o Edge Functions.

---

## 📂 3. Estructura de Carpetas

```
RIESGOS/
├── src/                          # Código fuente del frontend
│   ├── App.tsx                   # Punto de entrada, rutas y providers
│   ├── main.tsx                  # Bootstrap de React
│   ├── index.css                 # Estilos globales + tokens CSS
│   ├── i18n.ts                   # Configuración de internacionalización
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Primitivos de shadcn/ui (Button, Dialog, etc.)
│   │   ├── ai/                   # Componentes de IA (RiskPredictionDashboard)
│   │   ├── admin/                # Componentes administrativos (TemplateManager)
│   │   ├── audits/               # Componentes de auditoría (AuditsManager)
│   │   ├── AppLayout.tsx         # Layout principal con sidebar
│   │   ├── ErrorBoundary.tsx     # Captura global de errores React
│   │   ├── ModuleShell.tsx       # Wrapper Suspense por módulo
│   │   └── SecuritySettings.tsx  # Configuración MFA/seguridad
│   │
│   ├── pages/                    # Vistas completas (una por ruta)
│   │   ├── DashboardPage.tsx     # KPIs y métricas generales
│   │   ├── RisksPage.tsx         # CRUD de riesgos
│   │   ├── ActionsPage.tsx       # Planes de acción
│   │   ├── EvidencesPage.tsx     # Gestión de evidencias
│   │   ├── CompaniesPage.tsx     # Gestión multi-empresa
│   │   ├── AlertsPage.tsx        # Centro de alertas
│   │   ├── ReportsPage.tsx       # Generación de reportes
│   │   ├── AuditorPage.tsx       # Panel del auditor
│   │   ├── SuperAdminPage.tsx    # Panel superadministrador
│   │   ├── AuditLogsPage.tsx     # Logs de auditoría
│   │   ├── WebhooksPage.tsx      # Gestión de webhooks
│   │   ├── InventoryPage.tsx     # Inventario de activos
│   │   ├── ExternalUploadPage.tsx# Upload externo (proveedores)
│   │   └── AuthPage.tsx          # Login / Registro / MFA
│   │
│   ├── contexts/                 # Estado global via React Context
│   │   ├── AuthContext.tsx       # Sesión, rol, plan, suscripción, MFA
│   │   └── CompanyContext.tsx    # Empresa seleccionada + lista
│   │
│   ├── hooks/                    # Custom hooks reutilizables
│   │   ├── use-mobile.tsx        # Detección de dispositivo móvil
│   │   └── use-toast.ts          # Sistema de notificaciones
│   │
│   ├── lib/                      # Utilidades y helpers
│   │   ├── supabaseSafe.ts       # Wrapper seguro para queries
│   │   ├── lazyWithRetry.tsx     # Lazy loading con reintentos
│   │   ├── safeCacheClear.ts     # Limpieza segura de cache
│   │   ├── export.ts             # Utilidades de exportación
│   │   └── utils.ts              # Utilidades generales (cn, etc.)
│   │
│   ├── integrations/             # Clientes de servicios externos
│   │   └── supabase/
│   │       ├── client.ts         # Instancia tipada del cliente
│   │       └── types.ts          # Tipos auto-generados del schema
│   │
│   └── test/                     # Tests unitarios y de integración
│
├── server/                       # Backend Express (API REST auxiliar)
│   ├── api.ts                    # Servidor Express + endpoints
│   ├── emails.ts                 # Lógica de envío de emails
│   └── webhooks.ts               # Dispatching de webhooks
│
├── supabase/                     # Infraestructura Supabase
│   ├── config.toml               # Configuración del proyecto
│   ├── functions/                # Edge Functions (Deno)
│   │   └── chat-ai/              # Función serverless para chat IA
│   └── migrations/               # Migraciones SQL versionadas
│
├── public/                       # Assets estáticos
├── .env / .env.example           # Variables de entorno
├── vite.config.ts                # Configuración de Vite
├── tailwind.config.ts            # Configuración de Tailwind
├── vitest.config.ts              # Configuración de tests
├── playwright.config.ts          # Configuración E2E
└── package.json                  # Dependencias y scripts
```

---

## 🔄 4. Flujo del Sistema

### Flujo de Autenticación

```
Usuario → AuthPage → Supabase Auth (email/password)
  → onAuthStateChange detecta sesión
  → AuthContext carga perfil (role, plan, subscription)
  → Si MFA requerido → Verificación TOTP
  → Redirección a Dashboard
```

### Flujo de Operación CRUD (ejemplo: Riesgos)

```
1. Usuario navega a /risks
2. React Router carga RisksPage (lazy loaded via lazyWithRetry)
3. ModuleShell muestra Suspense fallback mientras carga
4. Componente ejecuta query via Supabase SDK directo
5. React Query cachea la respuesta (staleTime: 5 min)
6. Usuario interactúa (crear/editar/eliminar)
7. Mutación via Supabase SDK → invalidateQueries → refetch
8. Toast de confirmación al usuario
9. audit_logs registra la acción automáticamente
```

### Flujo de Predicción IA

```
1. Usuario abre RiskPredictionDashboard
2. Frontend envía POST /api/ai/predict-risks con Bearer token
3. Express API valida token via Supabase Auth
4. API consulta riesgos de la empresa en Supabase
5. Construye prompt contextualizado para Gemini 1.5 Flash
6. Gemini retorna análisis en Markdown
7. Frontend renderiza la predicción al usuario
```

---

## 🔗 5. Integraciones

| Servicio | Método de Conexión | Seguridad |
|----------|-------------------|-----------|
| **Supabase PostgreSQL** | SDK tipado con anon key + RLS | Row Level Security por `owner_id` / `user_id` |
| **Supabase Auth** | SDK nativo con JWT | Tokens auto-refresh, MFA opcional (TOTP) |
| **Supabase Storage** | SDK con signed URLs | Políticas por bucket, acceso autenticado |
| **Google Gemini** | REST via `@google/generative-ai` | API key solo en server-side (`.env`) |
| **Webhooks** | HTTP POST saliente | Secret compartido por webhook, HMAC verification |
| **Email SMTP** | Nodemailer / SMTP directo | Credenciales en `.env`, TLS obligatorio |

### Manejo Seguro de Integraciones

```
REGLA: Toda integración externa se gestiona exclusivamente desde:
  ├── server/          → Para APIs que requieren secrets
  ├── supabase/functions/ → Para lógica serverless
  └── NUNCA desde src/ directamente con API keys
```

---

## 🔐 6. Seguridad en la Arquitectura

### Modelo de Seguridad: Defensa en Profundidad

```
┌─────────────────────────────────────┐
│  Capa 1: Autenticación              │
│  → Supabase Auth (JWT + MFA)        │
├─────────────────────────────────────┤
│  Capa 2: Autorización               │
│  → RBAC (superadmin/admin/user/     │
│     auditor) via user_roles tabla   │
├─────────────────────────────────────┤
│  Capa 3: Aislamiento de Datos       │
│  → RLS policies por owner_id        │
│  → Multi-tenant por company_id      │
├─────────────────────────────────────┤
│  Capa 4: Validación                 │
│  → Zod schemas en frontend          │
│  → CHECK constraints en PostgreSQL  │
├─────────────────────────────────────┤
│  Capa 5: Auditoría                  │
│  → audit_logs con IP, user, action  │
│  → old_data / new_data diff         │
└─────────────────────────────────────┘
```

### Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `superadmin` | Acceso total, gestión de usuarios, configuración global |
| `admin` | CRUD completo en su empresa, reportes, auditorías |
| `auditor` | Lectura de riesgos, ejecución de auditorías, checklists |
| `user` | CRUD básico en riesgos y acciones de su empresa |

### Protección contra Vulnerabilidades

| Vulnerabilidad | Mitigación |
|----------------|------------|
| SQL Injection | Supabase SDK parametrizado (nunca queries raw) |
| XSS | React escapa HTML por defecto + CSP headers |
| CSRF | SameSite cookies + Bearer token en API |
| Acceso no autorizado | RLS + validación de sesión en cada request |
| Fuerza bruta | Rate limiting en Supabase Auth |
| Token theft | Auto-refresh + expiración corta + MFA |

---

## ⚙️ 7. Manejo de Configuración

### Variables de Entorno

```bash
# .env (NO commitear jamás)
VITE_SUPABASE_PROJECT_ID=plekrenflycwjludkrxb
VITE_SUPABASE_URL=https://plekrenflycwjludkrxb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...  # Anon key (segura para frontend)

# Solo server-side
GEMINI_API_KEY=AI...                     # NUNCA en frontend
WEBHOOK_SECRET=whsec_...                 # NUNCA en frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...      # NUNCA en frontend
```

### Separación por Ambientes

| Ambiente | Base de Datos | API URL | Notas |
|----------|--------------|---------|-------|
| **Development** | Supabase proyecto dev | `localhost:8080` | HMR activo, source maps |
| **Staging** | Supabase branch preview | Preview URL | Validación pre-producción |
| **Production** | Supabase producción | Dominio final | Builds optimizados, sin source maps |

### Reglas de Configuración

- `.env` listado en `.gitignore` (obligatorio)
- `.env.example` documenta todas las variables requeridas (sin valores reales)
- Variables `VITE_*` son las únicas accesibles desde el frontend
- Variables sin prefijo `VITE_` solo disponibles en `server/`

---

## 💾 8. Manejo de Datos

### Modelo de Datos Principal

```
companies ──┐
             ├──→ risks ──→ actions
             │         └──→ evidences
             │
             ├──→ audits
             │
             └──→ vulnerabilidades

users ──→ user_roles
     └──→ profiles (plan, subscription)
     └──→ alerts
     └──→ audit_logs

risk_templates (catálogo global por sector)
webhooks (configuración de integraciones)
```

### Validación de Datos

| Capa | Método | Ejemplo |
|------|--------|---------|
| **Frontend** | Zod schemas + React Hook Form | `z.string().min(1).max(200)` |
| **Base de datos** | CHECK constraints + NOT NULL | `risk_level BETWEEN 1 AND 25` |
| **API** | Express middleware + validación manual | Token válido + payload check |

### Sanitización

- Inputs de texto: escapados por React (JSX)
- Queries: parametrizadas por Supabase SDK
- Archivos: validación de tipo MIME + tamaño en Storage policies
- Exports: datos sanitizados antes de generar PDF/Excel

### Persistencia

| Dato | Almacenamiento | Duración |
|------|---------------|----------|
| Sesión de usuario | localStorage (Supabase Auth) | Hasta logout o expiración |
| Empresa seleccionada | localStorage | Persistente entre sesiones |
| Cache de queries | Memoria (React Query) | staleTime: 5min, gcTime: 30min |
| Datos de negocio | PostgreSQL (Supabase) | Permanente con backup automático |
| Archivos/evidencias | Supabase Storage | Permanente con políticas de retención |

---

## 🧪 9. Estrategia de Pruebas

| Tipo | Herramienta | Alcance |
|------|------------|---------|
| **Unitarias** | Vitest + Testing Library | Hooks, utils, componentes aislados |
| **Integración** | Vitest + jsdom | Flujos completos de componentes |
| **E2E** | Playwright | Flujos críticos (login, CRUD, reports) |
| **Coverage** | @vitest/coverage-v8 | Mínimo 70% en `lib/` y `contexts/` |

### Qué Probar Obligatoriamente

1. **AuthContext**: Login, logout, refresh, MFA, roles
2. **CompanyContext**: Selección, persistencia, auto-select
3. **CRUD de cada módulo**: Crear, leer, actualizar, eliminar
4. **ErrorBoundary**: Recuperación de errores sin crash
5. **LazyWithRetry**: Reintentos de carga de módulos

### Cómo Evitar Romper Funcionalidades

- Ejecutar `npm test` antes de cada commit
- Lazy loading aislado: cada módulo falla independientemente
- ErrorBoundary envuelve cada ruta (errores no propagan)
- React Query retry: 1 intento antes de mostrar error

> 📎 Ver [TESTING.md](./TESTING.md) para el plan de pruebas completo.

---

## 🚀 10. Escalabilidad

### Estrategia de Crecimiento

| Dimensión | Actual | Escalado |
|-----------|--------|----------|
| **Usuarios** | ~50 | RLS + connection pooling (PgBouncer en Supabase) |
| **Empresas** | ~10 | Multi-tenant por `company_id`, sin límite de schema |
| **Módulos** | 14 páginas | Lazy loading + code splitting automático por Vite |
| **Datos** | ~10K filas | Índices PostgreSQL + paginación server-side |
| **API** | Express single instance | PM2 cluster mode o migración a Edge Functions |

### Patrones de Escalabilidad Implementados

1. **Code Splitting**: Cada página es lazy-loaded (`lazyWithRetry`)
2. **Stale-While-Revalidate**: React Query evita requests redundantes
3. **Deduplicación de Auth**: Token dedup en `onAuthStateChange` evita re-renders
4. **Content-hash cache busting**: Builds con `[name]-[hash].js` para CDN
5. **Visibility Manager**: Pausa/reanuda mutations según pestaña activa

### Crecimiento Sin Romper

```
Para agregar un nuevo módulo:
1. Crear NewPage.tsx en src/pages/
2. Agregar lazyWithRetry en App.tsx
3. Agregar <Route> dentro de ProtectedRoutes
4. Agregar link en AppLayout sidebar
5. Crear migración SQL si requiere nueva tabla
→ CERO impacto en módulos existentes
```

---

## ⚠️ 11. Riesgos Técnicos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | **Vendor lock-in con Supabase** | Media | Alto | Usar SQL estándar. Supabase es open-source y auto-hosteable. |
| 2 | **Costos de Gemini API** | Media | Medio | Rate limiting en server, cache de predicciones, modelo Flash (económico). |
| 3 | **Sesiones fantasma** | Baja | Alto | Failsafe timeout de 8s en AuthContext + watchdog en signOut. |
| 4 | **RLS mal configurado** | Baja | Crítico | Tests de seguridad + auditoría periódica de policies. |
| 5 | **Bundle size excesivo** | Media | Medio | Lazy loading ya implementado. Monitorear con `vite build --report`. |
| 6 | **Pérdida de datos en cache** | Baja | Medio | `safeCacheClear.ts` limpia solo lo necesario, no toda la sesión. |
| 7 | **Dependencia de anon key expuesta** | Baja | Bajo | RLS protege datos. Anon key es segura por diseño en Supabase. |

---

## 📌 12. Reglas Arquitectónicas

### Obligatorias (Sin Excepción)

| # | Regla | Justificación |
|---|-------|---------------|
| 1 | **No mezclar capas** | UI no accede a DB directamente sin el SDK tipado. Server no renderiza HTML. |
| 2 | **No duplicar lógica** | Si un cálculo se usa en 2+ lugares, extraer a `lib/` o un hook. |
| 3 | **No romper compatibilidad** | Nuevos módulos se agregan aditivamente. Nunca modificar interfaces existentes sin migración. |
| 4 | **No exponer secrets en frontend** | Solo variables `VITE_*` (anon keys) en `src/`. Todo lo demás en `server/`. |
| 5 | **No queries sin tipado** | Toda interacción con Supabase usa el cliente tipado de `integrations/supabase/`. |
| 6 | **No commits sin tests** | Ejecutar `npm test` antes de push. CI debe bloquear merges sin tests passing. |
| 7 | **No migraciones destructivas** | `ALTER TABLE` aditivo. Nunca `DROP COLUMN` sin migración de datos previa. |
| 8 | **Cada módulo es independiente** | ErrorBoundary + Suspense + lazy loading = un módulo roto no tumba la app. |

### Convenciones de Código

| Aspecto | Convención |
|---------|------------|
| Nombres de archivos | PascalCase para componentes, camelCase para utils |
| Nombres de tablas SQL | snake_case plural (`risks`, `audit_logs`) |
| Variables de entorno | SCREAMING_SNAKE_CASE con prefijo `VITE_` si es frontend |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |
| Branches | `feature/nombre`, `fix/nombre`, `hotfix/nombre` |

---

## 🧠 Modo de Trabajo

### Antes de Implementar Cualquier Cambio

```
1. 🔍 Analizar el problema — ¿Qué módulos afecta?
2. 📐 Evaluar impacto    — ¿Puede romper algo existente?
3. 🏗️ Diseñar solución   — ¿Sigue las reglas arquitectónicas?
4. 🧪 Definir pruebas    — ¿Cómo verifico que funciona?
5. 🚀 Implementar        — Código + tests + documentación
6. ✅ Validar             — Regresión completa antes de merge
```

---

> **Documento mantenido por:** Equipo de Desarrollo — CHV RiskInsight  
> **Próxima revisión:** Al agregar nuevo módulo o cambiar infraestructura  
> **Documentos relacionados:** [TESTING.md](./TESTING.md) · [ROADMAP.md](./ROADMAP.md) · [README.md](./README.md)
