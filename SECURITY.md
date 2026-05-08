# 🔐 SECURITY.md — Política de Seguridad

> **Proyecto:** CHV RiskInsight — Sistema de Gestión de Riesgos Corporativos  
> **Versión:** 1.0  
> **Última actualización:** 2026-05-04  
> **Clasificación:** Documento interno — Uso obligatorio

---

## 🎯 Objetivo

Definir las normas de seguridad que deben cumplirse en el **desarrollo, despliegue y operación** del sistema CHV RiskInsight, garantizando la protección de datos sensibles, la integridad operacional y el cumplimiento de estándares de seguridad empresarial.

> ⚠️ **Todo miembro del equipo y todo agente de IA debe cumplir estas normas sin excepción.**

---

## 📑 Tabla de Contenidos

1. [Principios de Seguridad](#-principios-de-seguridad)
2. [Manejo de Credenciales](#-manejo-de-credenciales)
3. [Validación de Datos](#️-validación-de-datos)
4. [Control de Acceso](#-control-de-acceso)
5. [Seguridad en APIs](#-seguridad-en-apis)
6. [Manejo de Errores](#-manejo-de-errores-seguro)
7. [Dependencias](#-dependencias)
8. [Pruebas de Seguridad](#-pruebas-de-seguridad)
9. [Registros y Auditoría](#-registros-y-auditoría)
10. [Vulnerabilidades](#️-vulnerabilidades)
11. [Actualizaciones](#-actualizaciones)
12. [Respuesta a Incidentes](#-respuesta-a-incidentes)
13. [Uso de IA](#-uso-de-ia)
14. [Regla de Oro](#-regla-de-oro)

---

# 🚨 PRINCIPIOS DE SEGURIDAD

El sistema se rige por la tríada **CIA** de seguridad de la información:

```
┌─────────────────────────────────────────────────────┐
│              TRÍADA DE SEGURIDAD                    │
│                                                     │
│          ┌──────────────────────┐                   │
│          │  CONFIDENCIALIDAD    │                   │
│          │  Solo los usuarios   │                   │
│          │  autorizados acceden │                   │
│          │  a los datos         │                   │
│          └──────────┬───────────┘                   │
│                     │                               │
│     ┌───────────────┴───────────────┐               │
│     │                               │               │
│  ┌──┴──────────────┐  ┌────────────┴────────┐      │
│  │   INTEGRIDAD    │  │  DISPONIBILIDAD     │      │
│  │   Los datos no  │  │  El sistema está    │      │
│  │   se alteran    │  │  accesible cuando   │      │
│  │   sin control   │  │  se necesita        │      │
│  └─────────────────┘  └─────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

| Principio | Aplicación en CHV RiskInsight |
|-----------|------------------------------|
| **Confidencialidad** | RLS por empresa/usuario, MFA, roles RBAC, tokens JWT |
| **Integridad** | Validación Zod, audit_logs con old/new data, transacciones atómicas |
| **Disponibilidad** | ErrorBoundary, failsafe timeouts, cache React Query, lazy loading |

---

# 🔑 MANEJO DE CREDENCIALES

## ❌ Prohibido (Tolerancia Cero)

| Violación | Ejemplo | Severidad |
|-----------|---------|-----------|
| Hardcodear claves en código | `const KEY = "sk-abc123"` | 🔴 Crítica |
| Exponer tokens en repositorio | Commitear `.env` con secrets | 🔴 Crítica |
| API keys en código frontend | `SUPABASE_SERVICE_ROLE_KEY` en `src/` | 🔴 Crítica |
| Loguear credenciales | `console.log(token, password)` | 🔴 Crítica |
| Compartir secrets por chat/email | Enviar API keys por Slack/Teams | 🟡 Alta |
| Usar la misma key en todos los ambientes | Misma key en dev y prod | 🟡 Alta |

## ✅ Obligatorio

| Práctica | Implementación |
|----------|----------------|
| Variables de entorno | Archivo `.env` local, nunca commitear |
| `.env.example` actualizado | Documenta variables requeridas sin valores reales |
| `.gitignore` protege secrets | `.env`, `*.key`, `*.pem` en gitignore |
| Prefijo `VITE_` controlado | Solo variables seguras para el frontend |
| Rotación periódica | Cambiar keys comprometidas inmediatamente |

### Mapa de Credenciales del Proyecto

```
CREDENCIALES EN FRONTEND (src/) — Solo con prefijo VITE_
├── VITE_SUPABASE_URL          → URL pública del proyecto (segura)
├── VITE_SUPABASE_PUBLISHABLE_KEY → Anon key (segura, protegida por RLS)
└── VITE_SUPABASE_PROJECT_ID   → ID del proyecto (seguro)

CREDENCIALES EN SERVIDOR (server/) — NUNCA en frontend
├── GEMINI_API_KEY             → API key de Google AI
├── WEBHOOK_SECRET             → Secret para verificación HMAC
├── SUPABASE_SERVICE_ROLE_KEY  → Key administrativa (acceso total)
└── SMTP_PASSWORD              → Credenciales de email

CREDENCIALES EN EDGE FUNCTIONS (supabase/functions/)
└── Gestionadas via Supabase Dashboard → Secrets
```

---

# 🛡️ VALIDACIÓN DE DATOS

### Regla Fundamental

> 🚫 **NUNCA confiar en datos que provienen del usuario, del navegador o de APIs externas.**

### Estrategia de Validación por Capas

| Capa | Método | Ubicación |
|------|--------|-----------|
| **Frontend** | Zod schemas + React Hook Form | `src/pages/*.tsx` |
| **API Server** | Express middleware + validación manual | `server/api.ts` |
| **Base de datos** | CHECK constraints + NOT NULL + tipos | `supabase/migrations/` |
| **RLS** | Políticas PostgreSQL por fila | Supabase Dashboard |

### Tipos de Validación Obligatoria

```
✅ Tipo de dato     → ¿Es string, number, boolean como se espera?
✅ Rango/Longitud   → ¿Está dentro de los límites aceptables?
✅ Formato          → ¿Email es email? ¿UUID es UUID?
✅ Existencia       → ¿El registro referenciado existe?
✅ Autorización     → ¿El usuario tiene permiso sobre este dato?
✅ Sanitización     → ¿Se escaparon caracteres peligrosos?
```

### Ejemplo de Validación Correcta

```typescript
// ✅ CORRECTO: Validación con Zod antes de enviar a Supabase
const riskSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  type: z.enum(["operational", "financial", "legal", "technical"]),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  company_id: z.string().uuid("ID de empresa inválido"),
});

// ❌ INCORRECTO: Insertar datos sin validar
await supabase.from("risks").insert(req.body); // PELIGROSO
```

---

# 🔒 CONTROL DE ACCESO

### Modelo: RBAC (Control de Acceso Basado en Roles)

```
┌─────────────────────────────────────────────────────────┐
│                  JERARQUÍA DE ROLES                     │
│                                                         │
│  superadmin ─── Acceso total al sistema                 │
│      │                                                  │
│    admin ────── CRUD completo en su empresa              │
│      │                                                  │
│   auditor ──── Lectura + auditorías + checklists        │
│      │                                                  │
│    user ─────── CRUD básico en su empresa               │
└─────────────────────────────────────────────────────────┘
```

### Matriz de Permisos

| Recurso | superadmin | admin | auditor | user |
|---------|:----------:|:-----:|:-------:|:----:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Riesgos (CRUD) | ✅ | ✅ | 👁️ | ✅ |
| Acciones (CRUD) | ✅ | ✅ | 👁️ | ✅ |
| Evidencias | ✅ | ✅ | 👁️ | ✅ |
| Empresas (CRUD) | ✅ | ✅ | ❌ | ❌ |
| Auditorías | ✅ | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ✅ | 👁️ |
| SuperAdmin Panel | ✅ | ❌ | ❌ | ❌ |
| Gestión de Usuarios | ✅ | ❌ | ❌ | ❌ |
| Webhooks | ✅ | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ | ✅ | ❌ |

> 👁️ = Solo lectura

### Mecanismos de Control

| Mecanismo | Descripción |
|-----------|-------------|
| **Supabase Auth** | JWT con auto-refresh y expiración corta |
| **MFA (TOTP)** | Segundo factor opcional, configurable por usuario |
| **RLS Policies** | Aislamiento de datos a nivel de fila en PostgreSQL |
| **user_roles table** | Tabla dedicada para asignación de roles |
| **AuthContext** | Verificación de rol en cada ruta protegida |
| **Express middleware** | `authenticate()` valida Bearer token en cada request |

---

# 🌐 SEGURIDAD EN APIs

### API REST (Express — `server/api.ts`)

| Control | Implementación |
|---------|----------------|
| Autenticación | Bearer token validado contra Supabase Auth |
| CORS | `cors()` middleware (configurar orígenes en producción) |
| Rate limiting | Implementar en producción (express-rate-limit) |
| Input validation | Validar body/params antes de procesar |
| Error handling | Nunca exponer stack traces al cliente |

### Supabase SDK (Cliente directo)

| Control | Implementación |
|---------|----------------|
| Anon key segura | Protegida por RLS (no da acceso completo) |
| Queries tipadas | `Database` types auto-generados |
| RLS activo | Cada tabla filtra por `owner_id` / `user_id` |

### Comunicación con Servicios Externos

```
REGLA: Toda comunicación externa debe:

1. Usar HTTPS exclusivamente
2. Validar certificados TLS
3. Implementar timeouts (no esperar indefinidamente)
4. Manejar errores de red (retry con backoff)
5. Validar la estructura de respuestas recibidas
6. No asumir que los datos son correctos o completos
```

---

# 🧾 MANEJO DE ERRORES (SEGURO)

## ❌ Evitar

| Práctica insegura | Riesgo |
|-------------------|--------|
| Mostrar stack traces al usuario | Expone rutas, versiones y lógica interna |
| Errores con detalles de BD | Expone nombres de tablas y columnas |
| Catch vacío sin logging | Bug invisible, imposible de diagnosticar |
| `console.log(error)` en producción | Posible fuga de datos en herramientas de monitoreo |

## ✅ Implementar

| Práctica segura | Ejemplo |
|-----------------|---------|
| Mensajes genéricos al usuario | `"Error al procesar la solicitud"` |
| Logs internos con contexto | `console.error("Risk insert failed:", { userId, error })` |
| Códigos de error estandarizados | `{ code: "AUTH_001", message: "Sesión expirada" }` |
| ErrorBoundary en React | Captura errores sin tumbar la aplicación |
| Fallbacks elegantes | Mostrar estado vacío en vez de pantalla blanca |

### Niveles de Error

| Nivel | Acción | Ejemplo |
|-------|--------|---------|
| 🔴 **Crítico** | Log + alerta + notificar admin | Fallo de autenticación masivo |
| 🟡 **Alto** | Log + toast al usuario | Error de red al guardar datos |
| 🟢 **Medio** | Log silencioso | Fallo en carga de módulo no crítico |
| ⚪ **Bajo** | Solo log de debug | Validación de campo rechazada |

---

# 📦 DEPENDENCIAS

### Política de Gestión

| Regla | Descripción |
|-------|-------------|
| **Origen confiable** | Solo paquetes de npm con mantenimiento activo |
| **Mínimo necesario** | No agregar dependencias para funcionalidades triviales |
| **Auditoría regular** | Ejecutar `npm audit` periódicamente |
| **Versiones fijadas** | Usar `package-lock.json` para reproducibilidad |
| **Actualización controlada** | No actualizar major versions sin pruebas de regresión |

### Checklist para Nueva Dependencia

```
□ ¿Es estrictamente necesaria? (¿No se puede hacer con código nativo?)
□ ¿Tiene mantenimiento activo? (¿Último commit < 6 meses?)
□ ¿Cuántas descargas semanales tiene?
□ ¿Tiene vulnerabilidades conocidas? (npm audit)
□ ¿Cuál es su tamaño de bundle? (bundlephobia.com)
□ ¿Es compatible con las dependencias actuales?
□ ¿Tiene licencia compatible? (MIT, Apache 2.0)
```

---

# 🧪 PRUEBAS DE SEGURIDAD

### Tests Obligatorios

| Categoría | Casos de Prueba | Herramienta |
|-----------|----------------|-------------|
| **Inputs maliciosos** | SQL injection, XSS, scripts en campos | Vitest + manual |
| **Autenticación** | Login inválido, token expirado, sesión robada | Playwright |
| **Autorización** | Acceso a rutas sin permiso, escalación de privilegios | Manual + Playwright |
| **Datos límite** | Strings vacíos, null, undefined, arrays enormes | Vitest |
| **RLS** | Acceso a datos de otra empresa/usuario | Manual via Supabase |
| **API** | Requests sin token, con token inválido, payloads malformados | Vitest + curl |

### Vectores de Ataque a Probar

| Vector | Prueba | Mitigación esperada |
|--------|--------|---------------------|
| `'; DROP TABLE risks; --` | Inyectar en campos de texto | SDK parametriza queries |
| `<script>alert('xss')</script>` | Inyectar en inputs de formulario | React escapa HTML |
| `../../../etc/passwd` | En campos de ruta/archivo | Validación de formato |
| Token de otro usuario | Usar token ajeno en Authorization | RLS rechaza el acceso |
| `company_id` de otra empresa | Modificar payload de request | RLS filtra por owner |

> 📎 Ver [TESTING.md](./TESTING.md) para el plan completo de pruebas.

---

# 🔍 REGISTROS Y AUDITORÍA

### Tabla `audit_logs` — Estructura

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único del registro |
| `user_id` | UUID | Quién realizó la acción |
| `action` | string | Qué acción se realizó (CREATE, UPDATE, DELETE) |
| `entity_type` | string | Tipo de entidad afectada (risk, action, company) |
| `entity_id` | UUID | ID de la entidad afectada |
| `old_data` | JSON | Estado anterior del registro |
| `new_data` | JSON | Estado nuevo del registro |
| `ip_address` | string | IP del usuario |
| `created_at` | timestamp | Cuándo ocurrió |

### Reglas de Logging

| ✅ Registrar | ❌ No registrar |
|-------------|----------------|
| Acciones CRUD en entidades | Passwords o tokens |
| Intentos de login fallidos | Contenido de archivos subidos |
| Cambios de permisos/roles | Datos personales completos (PII) |
| Errores críticos del sistema | API keys o secrets |
| Accesos desde IPs inusuales | Cookies de sesión |

### Retención

| Tipo de log | Retención mínima |
|-------------|-----------------|
| Audit logs de negocio | 2 años |
| Logs de error | 6 meses |
| Logs de acceso | 1 año |

---

# ⚠️ VULNERABILIDADES

### Matriz de Prevención

| Vulnerabilidad | Riesgo | Prevención implementada | Estado |
|----------------|--------|------------------------|--------|
| **SQL Injection** | Acceso/destrucción de datos | Supabase SDK con queries parametrizadas | ✅ Activo |
| **XSS** | Ejecución de scripts maliciosos | React escapa JSX por defecto | ✅ Activo |
| **CSRF** | Acciones no autorizadas | Bearer tokens (no cookies de sesión) | ✅ Activo |
| **Broken Auth** | Acceso no autorizado | JWT + MFA + RLS + auto-refresh | ✅ Activo |
| **Data Exposure** | Fuga de información sensible | RLS por fila + roles RBAC | ✅ Activo |
| **Broken Access Control** | Escalación de privilegios | user_roles table + verificación en AuthContext | ✅ Activo |
| **Insecure Dependencies** | Vulnerabilidades heredadas | npm audit + versiones fijadas | ⚠️ Periódico |
| **Misconfiguration** | Acceso por config incorrecta | `.env.example` documentado + revisión | ⚠️ Periódico |

### Checklist de Seguridad Pre-Despliegue

```
□  RLS está activo en TODAS las tablas con datos sensibles
□  No hay API keys expuestas en el código frontend
□  .env NO está commitado en el repositorio
□  CORS está configurado con orígenes específicos (no *)
□  Todos los endpoints requieren autenticación (excepto /health)
□  Los errores no exponen información interna
□  npm audit no reporta vulnerabilidades críticas
□  MFA está disponible y funcional
□  Tokens se invalidan correctamente al cerrar sesión
□  audit_logs está registrando acciones correctamente
```

---

# 🔄 ACTUALIZACIONES

### Política de Actualización

| Frecuencia | Acción |
|------------|--------|
| **Semanal** | Revisar `npm audit` en busca de vulnerabilidades |
| **Mensual** | Actualizar dependencias patch/minor |
| **Trimestral** | Evaluar actualizaciones major con pruebas de regresión |
| **Inmediata** | Parchear vulnerabilidades críticas (CVE con CVSS ≥ 9.0) |

### Proceso de Actualización Segura

```
1. Ejecutar npm audit
2. Identificar vulnerabilidades por severidad
3. Actualizar en branch separado
4. Ejecutar suite completa de tests
5. Verificar que no hay regresiones
6. Merge solo si todos los tests pasan
7. Documentar cambios en CHANGELOG
```

---

# 🚨 RESPUESTA A INCIDENTES

### Protocolo de Respuesta (4 fases)

```
┌─────────────────────────────────────────────────────────┐
│           PROTOCOLO DE RESPUESTA A INCIDENTES           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FASE 1: IDENTIFICACIÓN                 ⏱️ 0-15 min    │
│  ├── Detectar el problema                               │
│  ├── Clasificar severidad (Crítica/Alta/Media/Baja)     │
│  └── Notificar al equipo responsable                    │
│                                                         │
│  FASE 2: CONTENCIÓN                     ⏱️ 15-60 min   │
│  ├── Aislar el componente afectado                      │
│  ├── Revocar credenciales comprometidas                 │
│  ├── Bloquear acceso si es necesario                    │
│  └── Activar fallbacks/modo mantenimiento               │
│                                                         │
│  FASE 3: CORRECCIÓN                     ⏱️ 1-24 hrs    │
│  ├── Identificar causa raíz                             │
│  ├── Desarrollar parche                                 │
│  ├── Probar corrección en ambiente seguro               │
│  └── Desplegar fix a producción                         │
│                                                         │
│  FASE 4: DOCUMENTACIÓN                  ⏱️ Post-fix     │
│  ├── Escribir post-mortem                               │
│  ├── Actualizar políticas de seguridad                  │
│  ├── Implementar medidas preventivas                    │
│  └── Comunicar a stakeholders afectados                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Clasificación de Severidad

| Nivel | Criterio | Tiempo de respuesta |
|-------|----------|-------------------|
| 🔴 **Crítico** | Datos expuestos, acceso no autorizado, sistema caído | < 1 hora |
| 🟡 **Alto** | Vulnerabilidad explotable, degradación severa | < 4 horas |
| 🟢 **Medio** | Vulnerabilidad potencial, impacto limitado | < 24 horas |
| ⚪ **Bajo** | Best practice no cumplida, riesgo teórico | Próximo sprint |

---

# 🧠 USO DE IA

### Reglas de Seguridad para Agentes de IA

| # | Regla | Obligatoria |
|---|-------|:-----------:|
| 1 | No generar código que exponga credenciales | ✅ |
| 2 | Validar inputs en todo código generado | ✅ |
| 3 | No desactivar protecciones de seguridad (RLS, CORS, Auth) | ✅ |
| 4 | No sugerir dependencias con vulnerabilidades conocidas | ✅ |
| 5 | Aplicar principio de mínimo privilegio en todo código | ✅ |
| 6 | No loguear datos sensibles en código generado | ✅ |
| 7 | Incluir manejo de errores en funciones críticas | ✅ |
| 8 | Respetar la arquitectura de seguridad existente | ✅ |

### La IA debe verificar antes de generar código:

```
□ ¿Este código expone algún secret?
□ ¿Los inputs del usuario están validados?
□ ¿Los errores están manejados sin exponer internals?
□ ¿Se respeta el modelo de permisos (RBAC + RLS)?
□ ¿Se usa el cliente tipado de Supabase?
□ ¿Las API keys están en server-side exclusivamente?
```

> 📎 Ver [AGEND.md](./AGEND.md) para las reglas completas del agente de IA.

---

# 📌 REGLA DE ORO

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   👉 Si algo compromete la seguridad, NO se implementa.  ║
║                                                          ║
║   No hay excepción.                                      ║
║   No hay urgencia que lo justifique.                     ║
║   No hay feature que lo amerite.                         ║
║                                                          ║
║   SEGURIDAD > FUNCIONALIDAD > VELOCIDAD                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

> **Documento mantenido por:** Equipo de Desarrollo — CHV RiskInsight  
> **Próxima revisión:** Trimestral o tras cualquier incidente de seguridad  
> **Documentos relacionados:** [AGEND.md](./AGEND.md) · [TESTING.md](./TESTING.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
