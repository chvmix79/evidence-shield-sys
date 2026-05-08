# Documentación Técnica: Sistema de Plantillas y Normativas

Este documento detalla el funcionamiento del sistema de plantillas automatizadas implementado para la gestión de riesgos basada en sectores y normativas.

## 1. Arquitectura de Base de Datos

Se han implementado tres tablas principales para gestionar el catálogo maestro:

| Tabla | Propósito | Relaciones |
|-------|-----------|------------|
| `sectors` | Define las industrias o sectores económicos. | N/A |
| `standards` | Define las normas o marcos de cumplimiento (ISO, BASC, OEA). | `sector_id` -> `sectors` |
| `risk_templates` | Define los riesgos predeterminados asociados a una norma y sector. | `sector_id`, `standard_id` |

### Flujo de Datos
1. El **Super Admin** carga el catálogo en estas tablas.
2. Al crear una **Empresa** (`CompaniesPage`), el sistema busca en `standards` si hay normas vinculadas al sector seleccionado.
3. Si existen, se muestran en una vista previa.
4. Al confirmar la creación, se dispara una consulta a `risk_templates` para copiar los riesgos base a la tabla `risks` de la nueva empresa.

## 2. Lógica de Negocio: Agencia de Aduanas

Se ha pre-configurado el sector **Agencia de Aduanas** con una lógica especial:
- **Normas Vinculadas**: BASC y OEA.
- **Riesgos Automáticos**:
    - **BASC**: Contaminación de Carga, Intrusión Perimetral.
    - **OEA**: Suplantación de Identidad, Vulnerabilidad en Sistemas IT.

## 3. Roles y Seguridad (RLS)

- **SuperAdmin**: Permisos totales (CRUD) sobre las tablas de plantillas.
- **Auditor**: Permiso de **LECTURA** (`SELECT`) para supervisar los estándares aplicados.
- **Admin/User**: Permiso de LECTURA para que el sistema pueda autogenerar riesgos durante la creación de empresas.

## 4. Componentes de Interfaz

### `TemplateManager.tsx`
Localizado en `src/components/admin/TemplateManager.tsx`. Gestiona las tres pestañas de administración:
- **Sectores**: Creación simple.
- **Normativas**: Selección de sector y definición de código de norma.
- **Plantillas**: Formulario complejo que vincula el riesgo a una norma y establece niveles de probabilidad/impacto sugeridos.

### `CompaniesPage.tsx`
Incluye un `useEffect` que monitorea el cambio de sector en el formulario de creación para ejecutar la "detección preventiva" de normas.

## 5. Mantenimiento Futuro
Para añadir un nuevo sector automatizado:
1. Ir a **SuperAdmin** -> **Gestión de Plantillas**.
2. Crear el Sector.
3. Crear las Normativas asociadas a ese Sector.
4. Crear al menos una Plantilla de Riesgo por cada Normativa creada.

---
*Documentación generada automáticamente - v1.1.0 - Estabilización de Roadmap*
