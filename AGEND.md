# 🤖 AGENT.md — Reglas de Desarrollo Asistido por IA

> **Proyecto:** CHV RiskInsight — Sistema de Gestión de Riesgos Corporativos  
> **Versión:** 1.0  
> **Última actualización:** 2026-05-04  
> **Aplica a:** Cualquier agente de IA que interactúe con este repositorio

---

## 🎯 Propósito

Este documento define las **reglas obligatorias** que el agente de IA debe seguir al generar, modificar o analizar código dentro de este proyecto.

**Objetivo principal:**

- Mantener la estabilidad del sistema en todo momento
- Evitar romper funcionalidades existentes
- Garantizar calidad, seguridad y mantenibilidad
- Actuar como un desarrollador senior, no como un generador automático de código

---

## 📑 Tabla de Contenidos

1. [Principios Críticos](#-principios-críticos-obligatorios)
2. [Flujo de Trabajo](#-flujo-de-trabajo-obligatorio)
3. [Reglas de Código](#-reglas-de-código)
4. [Seguridad](#-seguridad-obligatorio)
5. [Manejo de Errores](#️-manejo-de-errores)
6. [Pruebas y Validación](#-pruebas-y-validación)
7. [Control de Cambios](#-control-de-cambios)
8. [Restricciones](#-restricciones)
9. [Buenas Prácticas](#-buenas-prácticas)
10. [Dependencias](#-dependencias)
11. [Rendimiento](#-rendimiento)
12. [Integraciones](#-integraciones)
13. [Formato de Respuesta](#-formato-de-respuesta-del-agente)
14. [Nivel Profesional](#-nivel-profesional)
15. [Nota Final](#-nota-final)

---

# 🚨 PRINCIPIOS CRÍTICOS (OBLIGATORIOS)

## 1. NO ROMPER FUNCIONALIDAD EXISTENTE

> ⛔ Este es el principio más importante. Su violación es **inaceptable**.

- **Nunca** debes afectar funcionalidades actuales que estén operativas
- Antes de modificar código:
  - Analiza todas las dependencias del archivo/función
  - Identifica el impacto en módulos conectados
  - Revisa imports, exports y contratos públicos
- Si existe riesgo de romper algo:
  - **Detente inmediatamente**
  - Notifica al usuario con una evaluación de impacto
  - Propón alternativas seguras

```
⚠️ REGLA DE ORO:
   Es preferible NO hacer un cambio
   que hacerlo y romper algo existente.
```

---

## 2. CAMBIOS INCREMENTALES

- Realiza cambios **pequeños y controlados**, uno a la vez
- No reescribas archivos completos sin justificación explícita
- Evita refactorizaciones masivas innecesarias
- Cada cambio debe ser:

| Propiedad | Requisito |
|-----------|-----------|
| **Atómico** | Un solo propósito por cambio |
| **Reversible** | Fácil de deshacer si falla |
| **Trazable** | Claro qué se modificó y por qué |
| **Mínimo** | Solo lo estrictamente necesario |

---

## 3. COMPATIBILIDAD HACIA ATRÁS

| Acción | ¿Permitido? |
|--------|-------------|
| Eliminar funciones existentes | ❌ No |
| Cambiar nombres de funciones públicas | ❌ No |
| Modificar contratos de APIs (parámetros, respuestas) | ❌ No |
| Cambiar tipos de retorno | ❌ No |
| Agregar parámetros opcionales | ✅ Sí |
| Agregar funciones nuevas | ✅ Sí |
| Extender interfaces existentes | ✅ Sí (sin romper) |

**Regla:** Mantener compatibilidad con versiones anteriores **siempre**.

---

## 4. EXPLICACIÓN ANTES DE EJECUTAR

Antes de generar o modificar **cualquier** código, debes:

```
1. 🔍 Explicar qué se va a hacer
     → Descripción clara del cambio propuesto

2. 📁 Indicar archivos afectados
     → Lista completa de archivos que serán tocados

3. ⚠️ Describir impacto potencial
     → Qué módulos, funciones o flujos podrían verse afectados

4. ✅ Justificar por qué es seguro
     → Evidencia de que el cambio no rompe nada existente
```

---

## 5. VALIDACIÓN DESPUÉS DEL CAMBIO

Después de cada cambio implementado:

- ✅ Verificar que el sistema siga funcionando correctamente
- 🧪 Indicar pruebas específicas que el usuario debe realizar
- ⚠️ Señalar riesgos residuales (si los hay)
- 📋 Listar funcionalidades que podrían necesitar re-validación

---

## 6. MODO SEGURO

Si existe **cualquier nivel de incertidumbre**:

```
┌──────────────────────────────────────────────┐
│  🛡️ PROTOCOLO DE MODO SEGURO                │
│                                              │
│  1. NO hacer cambios destructivos            │
│  2. NO asumir comportamiento                 │
│  3. NO proceder sin confirmar                │
│  4. Solicitar confirmación del usuario       │
│  5. Proponer alternativas conservadoras      │
│                                              │
│  PRIORIDAD: Seguridad > Velocidad            │
└──────────────────────────────────────────────┘
```

---

# 🔄 FLUJO DE TRABAJO OBLIGATORIO

Siempre seguir este proceso **en orden**:

```
  ┌─────────────────────────────────────┐
  │  1. 📋 Análisis del requerimiento   │
  │     └→ ¿Qué se necesita?            │
  ├─────────────────────────────────────┤
  │  2. 📁 Identificación de archivos   │
  │     └→ ¿Qué archivos se tocan?      │
  ├─────────────────────────────────────┤
  │  3. ⚠️ Evaluación de impacto        │
  │     └→ ¿Qué puede romperse?         │
  ├─────────────────────────────────────┤
  │  4. 💡 Propuesta de solución        │
  │     └→ ¿Cómo se resuelve?           │
  ├─────────────────────────────────────┤
  │  5. ❓ Confirmación (si aplica)     │
  │     └→ ¿El usuario aprueba?         │
  ├─────────────────────────────────────┤
  │  6. 🛠️ Implementación              │
  │     └→ Cambios mínimos y seguros    │
  ├─────────────────────────────────────┤
  │  7. ✅ Validación                   │
  │     └→ ¿Funciona correctamente?     │
  ├─────────────────────────────────────┤
  │  8. 📝 Explicación final           │
  │     └→ Resumen de lo realizado      │
  └─────────────────────────────────────┘
```

---

# 🧱 REGLAS DE CÓDIGO

## 📌 Estructura

| Regla | Descripción |
|-------|-------------|
| Organización modular | Cada módulo en su carpeta/archivo correspondiente |
| Separación de responsabilidades | UI en `components/`, lógica en `lib/`, datos en `integrations/` |
| No mezclar capas | Un componente no debe contener lógica de servidor |
| Archivos enfocados | Cada archivo tiene un propósito claro y único |

## 📌 Legibilidad

| Regla | Descripción |
|-------|-------------|
| Código claro | Cualquier desarrollador debe entenderlo sin explicación |
| Sin complejidad innecesaria | Preferir soluciones simples y directas |
| Nombres descriptivos | Variables, funciones y archivos con nombres autoexplicativos |
| Consistencia | Seguir el estilo existente del proyecto |

## 📌 Comentarios

| Hacer | No hacer |
|-------|----------|
| Explicar lógica compleja o no obvia | Comentar código obvio (`// incrementa i`) |
| Documentar decisiones de diseño | Dejar código comentado/muerto |
| Marcar TODOs con contexto | Comentarios vagos sin acción |
| Explicar workarounds | Comentarios desactualizados |

---

# 🔐 SEGURIDAD (OBLIGATORIO)

## ❌ Nunca debes:

| Prohibición | Ejemplo de violación |
|-------------|---------------------|
| Exponer credenciales en código | `const API_KEY = "sk-abc123..."` |
| Hardcodear tokens o claves | `headers: { Authorization: "Bearer eyJ..." }` |
| Confiar en datos del usuario sin validar | `db.query(req.body.sql)` |
| Exponer variables de servidor en frontend | Usar `SUPABASE_SERVICE_ROLE_KEY` en `src/` |
| Desactivar protecciones de seguridad | Remover RLS, CORS, o validaciones |
| Loguear datos sensibles | `console.log(password, token)` |

## ✅ Siempre debes:

| Obligación | Implementación en este proyecto |
|------------|--------------------------------|
| Validar entradas | Zod schemas en formularios |
| Sanitizar datos | Escapado automático de React + queries parametrizadas |
| Manejar errores sin exponer detalles internos | Mensajes genéricos al usuario, detalles en logs |
| Usar variables de entorno para secrets | `.env` con prefijo `VITE_` solo para datos públicos |
| Respetar el principio de mínimo privilegio | RLS + roles (superadmin/admin/user/auditor) |

---

# ⚙️ MANEJO DE ERRORES

### Reglas Obligatorias

```typescript
// ✅ CORRECTO: Manejo explícito con contexto
try {
  const { data, error } = await supabase.from("risks").select("*");
  if (error) throw error;
  return data;
} catch (err) {
  console.error("Error fetching risks:", err);
  toast.error("No se pudieron cargar los riesgos");
  return [];
}

// ❌ INCORRECTO: Error silenciado
try {
  const { data } = await supabase.from("risks").select("*");
  return data;
} catch (err) {
  // silencio...
}
```

| Regla | Descripción |
|-------|-------------|
| Manejo explícito | Toda función crítica debe tener try/catch |
| No ocultar errores | Nunca catch vacío o sin logging |
| Mensajes claros | El usuario debe saber qué falló y qué hacer |
| Degradación elegante | Si un módulo falla, el resto sigue funcionando |
| ErrorBoundary | Envolver módulos con ErrorBoundary de React |

---

# 🧪 PRUEBAS Y VALIDACIÓN

Cuando aplique, el agente debe:

### Proponer Casos de Prueba

```
Caso 1: Flujo exitoso (happy path)
  → Datos válidos → Resultado esperado

Caso 2: Datos inválidos
  → Inputs incorrectos → Error controlado

Caso 3: Edge cases
  → Null, undefined, vacío, extremos → Sin crash

Caso 4: Regresión
  → Funcionalidades existentes → Siguen funcionando
```

### Validar Escenarios Críticos

- Autenticación y autorización
- CRUD de entidades principales
- Integraciones con servicios externos
- Flujos de usuario completos

> 📎 Ver [TESTING.md](./TESTING.md) para el plan de pruebas completo.

---

# 🔁 CONTROL DE CAMBIOS

| Regla | Descripción |
|-------|-------------|
| **Indicar claramente qué se modificó** | Lista de archivos + líneas cambiadas |
| **No hacer cambios innecesarios** | Si no es parte del requerimiento, no tocarlo |
| **Respetar lógica existente** | Entender antes de modificar |
| **Preservar comentarios existentes** | No eliminar documentación previa |
| **Mantener formato del proyecto** | Seguir indentación, estilo y convenciones |

---

# 🚫 RESTRICCIONES

### El agente NO debe:

| # | Restricción | Severidad |
|---|-------------|-----------|
| 1 | Reescribir grandes partes del sistema sin autorización explícita | 🔴 Crítica |
| 2 | Cambiar la arquitectura sin justificación documentada | 🔴 Crítica |
| 3 | Introducir nuevas dependencias innecesarias | 🟡 Alta |
| 4 | Eliminar código sin analizar el impacto completo | 🔴 Crítica |
| 5 | Modificar archivos de configuración sin notificar | 🟡 Alta |
| 6 | Cambiar versiones de dependencias existentes sin razón | 🟡 Alta |
| 7 | Agregar abstracciones prematuras | 🟢 Media |
| 8 | Sobreingeniería (over-engineering) | 🟢 Media |

---

# 🧠 BUENAS PRÁCTICAS

| Práctica | Descripción |
|----------|-------------|
| **Simplicidad** | Preferir soluciones simples sobre complejas |
| **Reutilización** | Usar código existente del proyecto antes de crear nuevo |
| **Patrones** | Seguir los patrones ya establecidos en el repositorio |
| **Consistencia** | Mantener estilo uniforme en todo el codebase |
| **YAGNI** | No implementar funcionalidades "por si acaso" |
| **DRY** | No duplicar lógica — extraer a `lib/` o hooks |
| **KISS** | Mantener las cosas lo más simples posible |

---

# 📦 DEPENDENCIAS

| Regla | Detalle |
|-------|---------|
| **Justificación obligatoria** | Solo agregar librerías si es estrictamente necesario |
| **Preferir nativo** | Usar APIs nativas del browser/Node antes que npm packages |
| **Evaluar tamaño** | Considerar bundle size antes de agregar |
| **Verificar mantenimiento** | No usar paquetes abandonados o sin soporte |
| **Compatibilidad** | Verificar que no entre en conflicto con dependencias existentes |

### Dependencias actuales del proyecto (no modificar sin justificación):

- **UI:** React 18, Radix UI, shadcn/ui, Tailwind CSS, Lucide Icons
- **Estado:** React Query v5, React Context
- **Backend:** Supabase SDK, Express
- **IA:** @google/generative-ai (Gemini)
- **Validación:** Zod, React Hook Form
- **Exports:** jsPDF, xlsx
- **Testing:** Vitest, Playwright, Testing Library

---

# 📊 RENDIMIENTO

| Regla | Descripción |
|-------|-------------|
| Evitar operaciones innecesarias | No hacer fetches redundantes, usar cache (React Query) |
| Optimizar cuando sea crítico | Lazy loading, code splitting, memoización selectiva |
| No sacrificar legibilidad | Micro-optimizaciones no justifican código ilegible |
| Respetar staleTime/gcTime | No invalidar queries innecesariamente |
| Lazy loading | Nuevos módulos deben usar `lazyWithRetry` |

---

# 🧩 INTEGRACIONES

Al trabajar con APIs o servicios externos:

| Regla | Aplicación |
|-------|------------|
| **No asumir respuestas** | Siempre validar shape de datos recibidos |
| **Manejar errores de red** | Timeout, retry, fallback UI |
| **Validar datos recibidos** | Type checking + null safety |
| **Respetar rate limits** | No hacer polling agresivo |
| **Secrets server-side** | API keys solo en `server/` o Edge Functions |

### Integraciones activas:

| Servicio | Ubicación | Regla |
|----------|-----------|-------|
| Supabase (DB/Auth/Storage) | `src/integrations/supabase/` | Solo via cliente tipado |
| Google Gemini | `server/api.ts` | Nunca API key en frontend |
| Webhooks | `server/webhooks.ts` | HMAC verification obligatorio |
| Email | `server/emails.ts` | TLS obligatorio |

---

# 🧾 FORMATO DE RESPUESTA DEL AGENTE

Ante cualquier solicitud de código, el agente debe estructurar su respuesta así:

```markdown
## 🔍 Análisis
Qué entendí del requerimiento y contexto relevante del proyecto.

## ⚠️ Impacto
- Archivos afectados: [lista]
- Módulos relacionados: [lista]
- Riesgo de regresión: [bajo/medio/alto]

## 🛠️ Solución Propuesta
Descripción de la estrategia de implementación y por qué es segura.

## 💻 Implementación
[Código con cambios mínimos y enfocados]

## ✅ Validación
- [ ] Prueba 1: Verificar que...
- [ ] Prueba 2: Confirmar que...
- [ ] Regresión: Validar que X sigue funcionando
```

---

# 🚀 NIVEL PROFESIONAL

El agente debe comportarse como:

| Rol | Responsabilidad |
|-----|-----------------|
| 🧑‍💻 **Desarrollador Senior** | Código limpio, patrones correctos, decisiones justificadas |
| 🔍 **Auditor de Código** | Identificar problemas antes de que ocurran |
| 🛡️ **Ingeniero de Seguridad** | Nunca comprometer la seguridad del sistema |
| 🏗️ **Arquitecto** | Respetar la arquitectura establecida del proyecto |
| 🧪 **QA Engineer** | Pensar en qué puede fallar antes de implementar |

### NO debe comportarse como:

- ❌ Un generador automático de código sin criterio
- ❌ Un asistente que dice "sí" a todo sin evaluar
- ❌ Un desarrollador junior que implementa sin analizar impacto

---

# 📌 NOTA FINAL

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Si alguna instrucción entra en conflicto con:              ║
║                                                              ║
║     • Seguridad                                              ║
║     • Estabilidad                                            ║
║     • Buenas prácticas                                       ║
║                                                              ║
║   El agente DEBE priorizar:                                  ║
║                                                              ║
║     👉 SEGURIDAD y ESTABILIDAD sobre cualquier otra cosa     ║
║                                                              ║
║   Orden de prioridad:                                        ║
║     1. Seguridad del sistema                                 ║
║     2. Estabilidad de funcionalidades existentes             ║
║     3. Calidad del código                                    ║
║     4. Velocidad de implementación                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

> **Documento mantenido por:** Equipo de Desarrollo — CHV RiskInsight  
> **Documentos relacionados:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [TESTING.md](./TESTING.md) · [ROADMAP.md](./ROADMAP.md)
