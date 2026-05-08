# 🧪 TESTING.md — Plan de Pruebas

> **Proyecto:** CHV RiskInsight — Sistema de Gestión de Riesgos  
> **Versión:** 1.0  
> **Última actualización:** 2026-05-04  
> **Responsable:** Equipo de Desarrollo

---

## 🎯 Objetivo

Garantizar que el sistema funcione correctamente, de manera estable y predecible, **sin afectar funcionalidades existentes** tras cada cambio o nueva implementación.

Este plan establece los lineamientos, tipos de prueba, criterios de aceptación y procesos que deben seguirse **obligatoriamente** antes de considerar cualquier tarea como finalizada.

> ⚠️ **Regla de oro:** _Si no se prueba, no está terminado._

---

## 📑 Tabla de Contenidos

1. [Tipos de Pruebas](#-tipos-de-pruebas)
2. [Proceso de Pruebas](#-proceso-de-pruebas)
3. [Casos de Prueba](#-casos-de-prueba)
4. [Casos Críticos](#️-casos-críticos)
5. [Pruebas de Regresión](#-pruebas-de-regresión)
6. [Pruebas de Seguridad](#-pruebas-de-seguridad)
7. [Pruebas Manuales](#️-pruebas-manuales)
8. [Pruebas con IA](#-pruebas-con-ia)
9. [Criterios de Éxito](#-criterios-de-éxito)
10. [Criterios de Falla](#-criterios-de-falla)
11. [Frecuencia de Ejecución](#-frecuencia-de-ejecución)
12. [Reglas Generales](#-reglas-generales)
13. [Nota Final](#-nota-final)

---

## 🧩 Tipos de Pruebas

### 1. Pruebas Funcionales

Verifican que el sistema **haga lo que debe hacer** según los requisitos definidos.

| Aspecto              | Descripción                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Alcance**          | Cada módulo, formulario, flujo y endpoint                          |
| **Método**           | Comparar resultado real vs. resultado esperado                     |
| **Responsable**      | Desarrollador asignado a la funcionalidad                          |
| **Documentación**    | Registrar resultado en tabla de casos de prueba                    |

**Ejemplos de validación funcional:**

- Formularios guardan datos correctamente en Supabase
- Dashboard muestra KPIs actualizados en tiempo real
- Navegación entre módulos funciona sin errores de estado
- Filtros y búsquedas retornan resultados precisos

---

### 2. Pruebas de Regresión

Verifican que **cambios nuevos no rompan funcionalidades existentes**.

| Aspecto              | Descripción                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Alcance**          | Todas las funcionalidades previamente aprobadas                    |
| **Método**           | Re-ejecución de suite de pruebas tras cada cambio                  |
| **Responsable**      | Desarrollador + revisión cruzada                                   |
| **Frecuencia**       | Después de cada merge o despliegue                                 |

---

### 3. Pruebas de Errores (Manejo de Fallos)

Validan que el sistema **gestione correctamente las condiciones de error**.

| Aspecto              | Descripción                                                        |
| -------------------- | ------------------------------------------------------------------ |
| **Alcance**          | Inputs inválidos, timeouts, datos nulos, conexiones perdidas       |
| **Método**           | Inyección de datos malformados y simulación de fallos               |
| **Responsable**      | Desarrollador + QA                                                 |
| **Expectativa**      | Mensajes de error claros, sin crashes, sin datos corruptos         |

---

## 🔄 Proceso de Pruebas

Cada prueba debe seguir este flujo estandarizado:

```
┌─────────────────────────────────────────────────────────┐
│                   FLUJO DE PRUEBAS                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1️⃣  Identificar funcionalidad a probar                │
│        └─→ ¿Qué módulo, flujo o endpoint se valida?     │
│                                                         │
│   2️⃣  Definir escenarios de prueba                      │
│        └─→ Casos positivos + negativos + edge cases     │
│                                                         │
│   3️⃣  Ejecutar pruebas                                  │
│        └─→ Manual o automatizada según el tipo          │
│                                                         │
│   4️⃣  Validar resultados                                │
│        └─→ ¿Resultado real == Resultado esperado?       │
│                                                         │
│   5️⃣  Documentar hallazgos                              │
│        └─→ Registrar en tabla de seguimiento            │
│                                                         │
│   6️⃣  Corregir y re-probar                              │
│        └─→ Ciclo hasta que todos los casos pasen ✅      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Casos de Prueba

### Plantilla Estándar

| Campo                 | Descripción                                             |
| --------------------- | ------------------------------------------------------- |
| **ID**                | Identificador único (ej. `TC-001`)                      |
| **Módulo**            | Módulo o componente bajo prueba                         |
| **Descripción**       | Qué se está probando                                    |
| **Precondiciones**    | Estado necesario antes de ejecutar                      |
| **Entrada**           | Datos o acciones del usuario                            |
| **Resultado esperado**| Lo que debe ocurrir                                     |
| **Resultado real**    | Lo que realmente ocurrió                                |
| **Estado**            | ✅ Aprobado / ❌ Fallido / ⏳ Pendiente                  |
| **Fecha**             | Fecha de ejecución                                      |
| **Responsable**       | Quién ejecutó la prueba                                 |

---

### Ejemplo: Casos de Prueba — Módulo de Autenticación

| ID       | Descripción                        | Entrada                  | Resultado Esperado              | Estado |
| -------- | ---------------------------------- | ------------------------ | ------------------------------- | ------ |
| TC-001   | Login con credenciales válidas     | Email y contraseña OK    | Acceso al Dashboard             | ✅     |
| TC-002   | Login con contraseña incorrecta    | Email OK + password mal  | Error: "Credenciales inválidas" | ✅     |
| TC-003   | Login con campos vacíos            | Formulario vacío         | Validación: "Campos requeridos" | ✅     |
| TC-004   | Login con email no registrado      | Email inexistente        | Error: "Usuario no encontrado"  | ⏳     |
| TC-005   | Sesión expirada                    | Token vencido            | Redirección a login             | ⏳     |

### Ejemplo: Casos de Prueba — Módulo de Riesgos

| ID       | Descripción                        | Entrada                  | Resultado Esperado              | Estado |
| -------- | ---------------------------------- | ------------------------ | ------------------------------- | ------ |
| TC-010   | Crear riesgo con datos válidos     | Formulario completo      | Registro guardado en BD         | ⏳     |
| TC-011   | Crear riesgo con campos vacíos     | Formulario incompleto    | Validación de campos requeridos | ⏳     |
| TC-012   | Editar riesgo existente            | Modificar descripción    | Actualización exitosa           | ⏳     |
| TC-013   | Eliminar riesgo                    | Confirmar eliminación    | Registro removido de BD         | ⏳     |
| TC-014   | Filtrar riesgos por categoría      | Seleccionar categoría    | Lista filtrada correctamente    | ⏳     |

---

## ⚠️ Casos Críticos

Las siguientes áreas requieren **pruebas exhaustivas** por su impacto directo en la operación:

### 🔴 Prioridad Alta

| Área                        | Riesgo si falla                                    | Pruebas requeridas       |
| --------------------------- | -------------------------------------------------- | ------------------------ |
| **Validación de datos**     | Datos corruptos en la base de datos                | Funcional + Seguridad    |
| **Autenticación / RLS**     | Acceso no autorizado a información sensible        | Seguridad + Regresión    |
| **CRUD de riesgos**         | Pérdida o alteración de registros críticos         | Funcional + Regresión    |
| **Dashboard / KPIs**        | Decisiones basadas en métricas incorrectas         | Funcional + Datos        |

### 🟡 Prioridad Media

| Área                        | Riesgo si falla                                    | Pruebas requeridas       |
| --------------------------- | -------------------------------------------------- | ------------------------ |
| **Exportación de reportes** | Reportes incompletos o malformados                 | Funcional                |
| **Notificaciones**          | Alertas no entregadas                              | Integración              |
| **Filtros y búsqueda**      | Resultados incorrectos                             | Funcional                |

### 🟢 Prioridad Baja

| Área                        | Riesgo si falla                                    | Pruebas requeridas       |
| --------------------------- | -------------------------------------------------- | ------------------------ |
| **UI / Estilos**            | Degradación visual                                 | Manual / Visual          |
| **Responsive design**       | Mala experiencia en dispositivos móviles           | Manual                   |

---

## 🔁 Pruebas de Regresión

### Protocolo Post-Cambio

Después de **cada cambio** en el código, se debe ejecutar el siguiente checklist:

```
□  Verificar que el login funciona correctamente
□  Verificar que el Dashboard carga sin errores
□  Verificar que la navegación entre módulos es fluida
□  Verificar que los formularios guardan datos correctamente
□  Verificar que los filtros y búsquedas retornan resultados válidos
□  Verificar que las políticas RLS siguen activas
□  Verificar que no hay errores en la consola del navegador
□  Verificar que los flujos completos (crear → editar → eliminar) funcionan
□  Verificar que los datos se refrescan correctamente (React Query)
□  Verificar que no hay regresiones visuales evidentes
```

### Matriz de Impacto

| Si cambias...                | Debes re-probar...                                         |
| ---------------------------- | ---------------------------------------------------------- |
| Autenticación                | Login, RLS, todos los módulos protegidos                   |
| Base de datos (schema)       | CRUD completo, Dashboard, Reportes                         |
| Componentes UI compartidos   | Todos los módulos que los utilizan                         |
| Lógica de negocio            | Módulo afectado + Dashboard + Exportaciones                |
| Configuración de Supabase    | Conexión, queries, RLS, funciones Edge                     |

---

## 🧪 Pruebas de Seguridad

### Vectores de Ataque a Validar

| Vector                          | Prueba                                              | Estado |
| ------------------------------- | --------------------------------------------------- | ------ |
| **SQL Injection**               | Inyectar `'; DROP TABLE --` en campos de texto      | ⏳     |
| **XSS (Cross-Site Scripting)**  | Inyectar `<script>alert('xss')</script>` en inputs  | ⏳     |
| **Inputs maliciosos**           | Caracteres especiales, Unicode, strings > 10K chars | ⏳     |
| **Datos inesperados**           | Null, undefined, arrays vacíos, tipos incorrectos   | ⏳     |
| **Manipulación de parámetros**  | Alterar IDs en URLs, modificar payloads de requests  | ⏳     |
| **Acceso no autorizado**        | Acceder a rutas protegidas sin sesión activa         | ⏳     |
| **Escalación de privilegios**   | Intentar acciones de admin con usuario regular       | ⏳     |
| **CSRF**                        | Enviar requests desde origen no autorizado           | ⏳     |

### Checklist de Seguridad

```
□  Todas las rutas protegidas redirigen a login si no hay sesión
□  RLS está activo en todas las tablas con datos sensibles
□  Los inputs del usuario son sanitizados antes de procesar
□  Las claves API no están expuestas en el frontend
□  Los tokens de sesión se invalidan correctamente al cerrar sesión
□  No se expone información sensible en mensajes de error
```

---

## 🛠️ Pruebas Manuales

### Checklist de Validación Manual

| Área                    | Verificación                                           | Estado |
| ----------------------- | ------------------------------------------------------ | ------ |
| **Navegación**          | Todas las rutas cargan sin errores                     | ⏳     |
| **Formularios**         | Validaciones client-side funcionan correctamente       | ⏳     |
| **Responsive**          | La UI se adapta a Desktop, Tablet y Mobile             | ⏳     |
| **Performance**         | Tiempos de carga < 3 segundos                          | ⏳     |
| **Accesibilidad**       | Contraste, tamaño de fuente, navegación con teclado    | ⏳     |
| **UX General**          | Flujos intuitivos, feedback visual al usuario          | ⏳     |
| **Errores visuales**    | Sin overlaps, sin textos cortados, alineación correcta | ⏳     |
| **Estados vacíos**      | Mensajes apropiados cuando no hay datos                | ⏳     |
| **Loading states**      | Spinners/skeletons visibles durante la carga           | ⏳     |

### Escenarios de Uso Real

1. **Flujo completo de un usuario nuevo:** Registro → Login → Dashboard → Crear riesgo → Editar → Eliminar → Logout
2. **Flujo de un administrador:** Login → Gestión de usuarios → Configuración → Reportes → Auditoría
3. **Flujo bajo estrés:** Múltiples tabs abiertas → Acciones simultáneas → Verificar integridad de datos

---

## 🤖 Pruebas con IA

La inteligencia artificial integrada en el flujo de desarrollo debe participar activamente en el proceso de pruebas:

### Responsabilidades de la IA

| Tarea                               | Descripción                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| **Proponer casos de prueba**         | Generar escenarios que el equipo humano podría pasar por alto    |
| **Identificar riesgos**              | Analizar cambios y señalar áreas de impacto potencial            |
| **Validar impacto de cambios**       | Evaluar si un cambio puede generar regresiones                   |
| **Revisar edge cases**               | Identificar condiciones límite y escenarios atípicos             |
| **Generar datos de prueba**          | Crear datasets realistas para pruebas funcionales                |
| **Análisis estático**                | Detectar posibles bugs, code smells y anti-patterns              |

### Protocolo de Validación con IA

```
1. Antes de implementar → La IA analiza el impacto del cambio propuesto
2. Durante la implementación → La IA revisa el código en busca de errores
3. Después de implementar → La IA propone pruebas de regresión específicas
4. Antes del despliegue → La IA valida que todos los criterios se cumplen
```

---

## 📊 Criterios de Éxito

Una implementación se considera **exitosa** cuando cumple **todos** los siguientes criterios:

| #  | Criterio                                              | Obligatorio |
| -- | ----------------------------------------------------- | ----------- |
| 1  | Sin errores críticos (crashes, data loss)             | ✅ Sí       |
| 2  | Sin errores en consola del navegador                  | ✅ Sí       |
| 3  | Funcionalidad estable y predecible                    | ✅ Sí       |
| 4  | Respuestas correctas y consistentes                   | ✅ Sí       |
| 5  | Pruebas de regresión pasadas al 100%                  | ✅ Sí       |
| 6  | Sin regresiones visuales                              | ✅ Sí       |
| 7  | Tiempos de respuesta aceptables (< 3s)                | ⚠️ Ideal    |
| 8  | Código revisado y documentado                         | ⚠️ Ideal    |

---

## 🚨 Criterios de Falla

Una implementación se marca como **fallida** si presenta **cualquiera** de las siguientes condiciones:

| #  | Condición de Falla                                    | Severidad   |
| -- | ----------------------------------------------------- | ----------- |
| 1  | Función previamente operativa ahora está rota         | 🔴 Crítica  |
| 2  | Error no controlado (crash, pantalla blanca)          | 🔴 Crítica  |
| 3  | Datos incorrectos guardados o mostrados               | 🔴 Crítica  |
| 4  | Vulnerabilidad de seguridad introducida               | 🔴 Crítica  |
| 5  | Pérdida de datos del usuario                          | 🔴 Crítica  |
| 6  | Degradación significativa de rendimiento              | 🟡 Alta     |
| 7  | Flujo de usuario interrumpido                         | 🟡 Alta     |
| 8  | Error visual que afecta la usabilidad                 | 🟢 Media    |

### Protocolo ante Falla

```
1. 🛑 DETENER el despliegue inmediatamente
2. 📝 Documentar el fallo con evidencia (screenshots, logs, pasos para reproducir)
3. 🔍 Identificar la causa raíz
4. 🔧 Implementar la corrección
5. 🧪 Re-ejecutar TODAS las pruebas afectadas
6. ✅ Validar que la corrección no introduce nuevas regresiones
7. 🚀 Proceder con el despliegue solo cuando todos los criterios de éxito se cumplan
```

---

## 🔄 Frecuencia de Ejecución

| Momento                              | Tipo de Prueba                        | Obligatorio |
| ------------------------------------ | ------------------------------------- | ----------- |
| **Antes de cada cambio**             | Análisis de impacto                   | ✅ Sí       |
| **Durante el desarrollo**            | Pruebas unitarias / funcionales       | ✅ Sí       |
| **Después de cada implementación**   | Regresión completa                    | ✅ Sí       |
| **Antes de cada despliegue**         | Suite completa + seguridad            | ✅ Sí       |
| **Semanalmente**                     | Revisión de seguridad                 | ⚠️ Ideal    |
| **Mensualmente**                     | Auditoría de pruebas completa         | ⚠️ Ideal    |

---

## 📌 Reglas Generales

### Mandatorias (Sin Excepción)

> 🚫 **No desplegar sin pruebas.**  
> Ningún cambio llega a producción sin haber pasado por el proceso de pruebas documentado.

> 🚫 **No asumir funcionamiento.**  
> El hecho de que "compiló sin errores" no significa que funciona. Probar siempre.

> 🚫 **Validar siempre.**  
> Cada input del usuario, cada respuesta de API, cada cambio de estado debe ser validado.

### Buenas Prácticas

- Escribir los casos de prueba **antes** o **durante** la implementación, no después.
- Documentar cada prueba ejecutada con su resultado.
- Mantener este documento actualizado con cada nueva funcionalidad.
- Priorizar las pruebas según la severidad del impacto.
- Automatizar pruebas repetitivas cuando sea posible.

---

## 🧠 Nota Final

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   👉  Si no se prueba, NO está terminado.                ║
║                                                          ║
║   Las pruebas no son un paso opcional.                   ║
║   Son parte integral del proceso de desarrollo.          ║
║                                                          ║
║   Código sin pruebas es código con bugs ocultos.         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

> **Documento mantenido por:** Equipo de Desarrollo — CHV RiskInsight  
> **Próxima revisión:** Al agregar nueva funcionalidad o módulo
