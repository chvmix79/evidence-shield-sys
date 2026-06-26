-- ============================================================================
-- AUDIT MODULE TABLES AND SEED DATA FOR ALL SECTORS
-- ============================================================================

-- 1. Tablas de Plantillas de Auditoría (Checklists)
CREATE TABLE IF NOT EXISTS public.audit_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id UUID REFERENCES public.sectors(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Items de las Listas de Chequeo
CREATE TABLE IF NOT EXISTS public.audit_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES public.audit_checklists(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    requirement_code TEXT,
    order_index INTEGER DEFAULT 0
);

-- 3. Ejecución de Auditorías
CREATE TABLE IF NOT EXISTS public.audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    checklist_id UUID REFERENCES public.audit_checklists(id),
    auditor_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'in_progress',
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Respuestas de la Auditoría
CREATE TABLE IF NOT EXISTS public.audit_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.audit_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.audit_checklist_items(id),
    response TEXT CHECK (response IN ('yes', 'no', 'na', 'partial')),
    observations TEXT,
    evidence_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Configurar Row Level Security (RLS)
ALTER TABLE public.audit_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_checklists_all" ON public.audit_checklists;
CREATE POLICY "audit_checklists_all" ON public.audit_checklists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_checklist_items_all" ON public.audit_checklist_items;
CREATE POLICY "audit_checklist_items_all" ON public.audit_checklist_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_sessions_all" ON public.audit_sessions;
CREATE POLICY "audit_sessions_all" ON public.audit_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_responses_all" ON public.audit_responses;
CREATE POLICY "audit_responses_all" ON public.audit_responses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. SEED DATA: LISTAS DE CHEQUEO PARA TODOS LOS SECTORES
-- ============================================================================

DO $$
DECLARE
    sec RECORD;
    cl_id UUID;
BEGIN
    FOR sec IN SELECT id, name FROM public.sectors LOOP
        
        -- Eliminar listas anteriores de este sector (opcional para no duplicar si se ejecuta 2 veces)
        DELETE FROM public.audit_checklists WHERE sector_id = sec.id;

        -- Crear Lista de Chequeo Principal para el sector
        INSERT INTO public.audit_checklists (name, description, sector_id)
        VALUES ('Auditoría Estándar - ' || sec.name, 'Lista de chequeo base para la industria: ' || sec.name, sec.id)
        RETURNING id INTO cl_id;

        -- Agregar items generales que aplican a todas las empresas
        INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
        (cl_id, 'Gestión Documental', '¿Se cuenta con políticas y procedimientos documentados y actualizados?', 'GEN-01'),
        (cl_id, 'Gestión Documental', '¿Existe un control de versiones de los documentos legales y normativos?', 'GEN-02'),
        (cl_id, 'Recursos Humanos', '¿Se realizan capacitaciones periódicas al personal en materia de riesgos y procesos?', 'RH-01'),
        (cl_id, 'Recursos Humanos', '¿Se validan los antecedentes y referencias de los nuevos empleados?', 'RH-02'),
        (cl_id, 'Infraestructura', '¿Las instalaciones físicas cuentan con controles de acceso adecuados y seguros?', 'INF-01'),
        (cl_id, 'Seguridad de la Información', '¿Se realizan copias de seguridad (backups) de la información crítica del negocio?', 'SI-01'),
        (cl_id, 'Cumplimiento', '¿Se han identificado todos los requisitos legales aplicables a la operación?', 'CUMP-01'),
        (cl_id, 'Continuidad', '¿Se cuenta con un plan de continuidad de negocio y recuperación ante desastres?', 'BCP-01');

        -- Agregar items ESPECÍFICOS dependiendo del sector
        IF sec.name ILIKE '%Tecnología%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Seguridad Lógica', '¿Existe un registro de accesos y revocación inmediata para empleados que salen?', 'ISO A.9.2.2'),
            (cl_id, 'Seguridad Lógica', '¿Los privilegios de administrador están restringidos al mínimo necesario?', 'ISO A.9.2.3'),
            (cl_id, 'Criptografía', '¿Los datos sensibles en reposo y tránsito están cifrados (AES-256 / TLS)?', 'ISO A.10.1');
        ELSIF sec.name ILIKE '%Salud%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Seguridad del Paciente', '¿Existe un comité activo de seguridad del paciente que sesione mensualmente?', 'Habilitación'),
            (cl_id, 'Privacidad', '¿Los funcionarios firmaron acuerdos de confidencialidad específicos para historias clínicas?', 'Ley 1581'),
            (cl_id, 'Bioseguridad', '¿Se cuenta con protocolos y rutas de manejo de residuos hospitalarios vigentes?', 'Habilitación');
        ELSIF sec.name ILIKE '%Banca%' OR sec.name ILIKE '%Finanzas%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'SARLAFT', '¿Se realiza validación en listas restrictivas (OFAC, ONU) de TODOS los clientes antes de vinculación?', 'SFC 029'),
            (cl_id, 'SARLAFT', '¿Existe un oficial de cumplimiento nombrado y registrado ante la entidad reguladora?', 'UIAF'),
            (cl_id, 'Riesgo Operativo', '¿Se reportan eventos de pérdida operativa e incidentes de forma periódica?', 'SARO');
        ELSIF sec.name ILIKE '%Aduanas%' OR sec.name ILIKE '%Logística%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Seguridad de Unidades', '¿Se realiza y documenta la inspección de los 17 puntos a todos los contenedores?', 'BASC 5.1'),
            (cl_id, 'Selección Crítica', '¿Se realiza visita domiciliaria a los empleados en cargos críticos anualmente?', 'BASC 4.2'),
            (cl_id, 'Sellos', '¿Existe un control estricto, resguardo y bitácora de sellos de alta seguridad (ISO 17712)?', 'ISO 17712');
        ELSIF sec.name ILIKE '%Manufactura%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Seguridad Ocupacional', '¿Se entregan y auditan periódicamente los Elementos de Protección Personal (EPP)?', 'ISO 45001'),
            (cl_id, 'Mantenimiento', '¿Existe un cronograma de mantenimiento preventivo cumplido al 100% para maquinaria crítica?', 'MANT-01');
        ELSIF sec.name ILIKE '%Retail%' OR sec.name ILIKE '%Alimentos%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Inocuidad', '¿Se cuenta con plan de saneamiento y control de plagas actualizado con proveedor certificado?', 'BPM-01'),
            (cl_id, 'Cadena de Frío', '¿Existen registros diarios (mañana/tarde) de control de temperatura de los cuartos fríos?', 'BPM-02');
        ELSIF sec.name ILIKE '%Construcción%' THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code) VALUES
            (cl_id, 'Trabajo en Alturas', '¿Todo el personal que trabaja a más de 1.5m tiene curso avanzado y equipo certificado de alturas?', 'SST-01'),
            (cl_id, 'Seguridad Obra', '¿Se realizan y firman charlas de seguridad de 5 minutos antes de iniciar labores diarias?', 'SST-02');
        END IF;

    END LOOP;
END $$;
