# 🛣️ ROADMAP - Plan de Desarrollo Profesional

# 🧭 ESTADO DEL SISTEMA
- **Proyecto:** CHV RiskInsight
- **Versión Actual:** 1.3.0
- **Estado General:** 🚀 Seguridad Reforzada / Producción-Ready
- **Última Actualización:** 2026-05-05 (Fase 3 & 4 Finalizadas)

---

# 📌 FASE 1 - FUNDACIÓN ✅
## Objetivo:
Establecer una base sólida, segura y escalable para la gestión de riesgos.

### 🔹 Tareas
- [x] Estructura inicial (Vite + React + TS)
- [x] Configuración de entorno (.env, Supabase hooks)
- [x] Implementación de base de datos relacional en Supabase
- [x] Sistema de Autenticación con MFA (2FA)

### ⚠️ Riesgos
- Falta de consistencia en tipos de datos (Solucionado con Sync manual)
- Debilidad en políticas de acceso iniciales (Solucionado con RLS estricto)

---

# 📌 FASE 2 - FUNCIONALIDADES CORE ✅
## Objetivo:
Implementar los módulos críticos para la operación del sistema de riesgos.

### 🔹 Tareas
- [x] **Módulo de Riesgos:** CRUD completo y vinculación con estándares.
- [x] **Planes de Acción:** Gestión de tareas, responsables y fechas de vencimiento.
- [x] **Gestión de Evidencias:** Integración con Supabase Storage para carga de archivos.
- [x] **Alertas y Notificaciones:** Sistema de alertas críticas y por saturación.
- [x] **Reportes Automáticos:** Generación de PDFs profesionales (jsPDF).

### 🧪 Validaciones
- Flujo completo desde identificación de riesgo hasta cierre de acción.
- Manejo de errores en carga de archivos de gran tamaño.

---

# 📌 FASE 3 - SEGURIDAD ✅
## Objetivo:
Garantizar la integridad y privacidad de la información corporativa sensible.

### 🔹 Tareas
- [x] **RLS (Row Level Security):** Implementado con éxito en todas las tablas (risks, companies, actions, evidences) con aislamiento multi-tenant y acceso total para SuperAdmin.
- [x] **Sanitización:** Uso de Zod para validación de esquemas en todos los formularios.
- [x] **Protección de IA (Edge Functions):** Migración exitosa de Gemini API a Supabase Edge Functions (Aislamiento de API Key).
- [x] **Auditoría de Cambios:** Logs automáticos de acciones de usuario.

### 🔐 Controles
- No exposición de `SERVICE_ROLE_KEY` en el cliente.
- Validación de integridad en webhooks entrantes.

---

# 📌 FASE 4 - OPTIMIZACIÓN 🔄
## Objetivo:
Mejorar la experiencia de usuario y la eficiencia del procesamiento de datos.

### 🔹 Tareas
- [x] **Refactorización de Promesas:** Cambio de `Promise.race` a `Promise.allSettled` en el Dashboard.
- [x] **Mejora UX/UI:** Implementación de Skeletal Loaders en todas las tablas principales (Empresas, Riesgos, Acciones, Evidencias).
- [x] **Lazy Loading Avanzado:** Gestión robusta de carga de módulos y propagación de errores al ErrorBoundary.
- [x] **Caché Inteligente:** Resolución de problemas de "caché infinita" y reset automático en caso de fallos.

---

# 📌 FASE 5 - ESCALABILIDAD 🚀
## Objetivo:
Preparar el sistema para un crecimiento masivo y nuevas plataformas.

### 🔹 Tareas
- [ ] **App Móvil (MVP):** React Native para captura de evidencias en campo.
- [ ] **SSO / SAML:** Integración con Azure AD / Google Workspace.
- [ ] **Dashboard Personalizable:** Sistema de widgets drag-and-drop para directivos.
- [ ] **IA Predictiva v2:** Análisis de tendencias históricas para prevenir riesgos recurrentes.

---

# 📌 FASE 6 - DESPLIEGUE FINAL 🏁
## Objetivo:
Salida a producción controlada y monitoreo continuo.

### 🔹 Tareas
- [x] **Configuración Producción:** Variables de entorno y secretos rotados.
- [ ] **Monitoreo de Errores:** Integración con Sentry o similar.
- [ ] **Pruebas de Carga:** Simulación de acceso concurrente masivo.
- [ ] **Capacitación:** Documentación final para administradores y auditores.

---

# 🔄 REGLAS DEL ROADMAP

## 🚨 CRÍTICAS
- **Validación Obligatoria:** No avanzar a la siguiente tarea sin validar la actual en el entorno de desarrollo.
- **Integridad:** Cualquier cambio que afecte a `risks` o `actions` debe pasar por los tests de regresión.
- **Seguridad:** Ninguna funcionalidad nueva puede saltarse las políticas RLS existentes.

---

## 🔁 CONTROL DE CAMBIOS
Cada tarea debe seguir el protocolo de **AGENT.md**:
1. Analizar impacto en dependencias.
2. Implementar cambios incrementales (atómicos).
3. Validar con Vitest/Playwright.
4. Documentar en el historial de versiones.

---

## 🧪 VALIDACIÓN CONTINUA
- Ejecutar `npm run test` después de cada modificación significativa.
- Verificación manual de flujos críticos (Auth, Upload, PDF Export).
- Revisión periódica de logs en Supabase para detectar anomalías.

---

## 📊 PRIORIDADES
1. **Estabilidad:** El sistema no debe caerse bajo ninguna circunstancia.
2. **Seguridad:** Los datos de una empresa nunca deben ser visibles para otra.
3. **Usabilidad:** El sistema debe ser intuitivo para usuarios no técnicos.
4. **IA:** El análisis de Gemini debe ser un apoyo, no una caja negra.

---

## 🧠 USO DE IA
El Agente de IA debe actuar bajo los principios de **AGENT.md**:
- **Proactivo:** Detectar posibles fallos en la lógica de seguridad.
- **Senior:** Proponer patrones de diseño limpios (SOLID, DRY).
- **Controlado:** No realizar reescrituras masivas innecesarias.

---

# 📌 BACKLOG (FUTURO PRÓXIMO)
- [ ] Integración con proveedores de Email (Resend).
- [ ] Notificaciones Push vía Web Push API.
- [ ] Automatización de auditorías basadas en calendario.

---

# 📈 MÉTRICAS DE ÉXITO
- **Uptime:** > 99.9%
- **Errores Críticos:** 0 en producción.
- **Cobertura de Tests:** > 80% en lógica de negocio.
- **Satisfacción:** Feedback positivo en la generación de reportes.

---

# 🚀 VISIÓN FINAL
Un ecosistema de gestión de riesgos líder, potenciado por IA, que sea la fuente de verdad única para la seguridad y el cumplimiento corporativo.