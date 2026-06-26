-- ==============================================================================
-- Migración: Separación de Sector Construcción e Inmobiliaria
-- Descripción:
-- 1. Renombra 'Construcción e Inmobiliaria' a 'Construcción'.
-- 2. Crea el nuevo sector 'Inmobiliaria y Bienes Raíces'.
-- 3. Inserta plantillas de riesgo específicas para inmobiliaria.
-- 4. Inserta preguntas de identificación de riesgos.
-- 5. Crea una lista de chequeo de auditoría inmobiliaria y sus ítems.
-- ==============================================================================

DO $$
DECLARE
    v_construction_id UUID;
    v_real_estate_id UUID;
    
    v_risk_aml_id UUID;
    v_risk_fraud_id UUID;
    v_risk_legal_id UUID;
    v_risk_market_id UUID;

    v_checklist_id UUID;
BEGIN
    -- 1. Renombrar sector existente
    UPDATE public.sectors 
    SET name = 'Construcción', description = 'Obras civiles, infraestructura y edificación'
    WHERE name ILIKE '%Construcción%Inmobiliaria%'
    RETURNING id INTO v_construction_id;

    -- Si no encontró el sector combinado, busca si ya existe uno de construcción a secas
    IF v_construction_id IS NULL THEN
        SELECT id INTO v_construction_id FROM public.sectors WHERE name ILIKE 'Construcción' LIMIT 1;
    END IF;

    -- 2. Crear nuevo sector: Inmobiliaria y Bienes Raíces
    SELECT id INTO v_real_estate_id FROM public.sectors WHERE name = 'Inmobiliaria y Bienes Raíces' LIMIT 1;
    
    IF v_real_estate_id IS NULL THEN
        INSERT INTO public.sectors (name, description, icon)
        VALUES ('Inmobiliaria y Bienes Raíces', 'Agencias, corretaje, administración de propiedades y arrendamientos', 'building')
        RETURNING id INTO v_real_estate_id;
    END IF;

    -- 3. Insertar Plantillas de Riesgo Inmobiliario (Risk Templates)
    IF v_real_estate_id IS NOT NULL THEN
        
        -- Riesgo: Lavado de Activos
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_real_estate_id,
            'Lavado de Activos y Financiación del Terrorismo (SARLAFT)',
            'Riesgo de que la empresa sea utilizada para dar apariencia de legalidad a recursos de origen ilícito a través de compraventas inmobiliarias.',
            'compliance', 3, 5
        ) RETURNING id INTO v_risk_aml_id;

        -- Riesgo: Fraude Documental
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_real_estate_id,
            'Fraude Documental y Suplantación',
            'Riesgo de falsificación de escrituras, certificados de tradición o suplantación de identidad en promesas de compraventa.',
            'legal', 3, 5
        ) RETURNING id INTO v_risk_fraud_id;

        -- Riesgo: Legal y Cartera
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_real_estate_id,
            'Incumplimiento de Arrendamientos (Cartera)',
            'Riesgo asociado a la falta de pago de cánones de arrendamiento, daños a inmuebles y procesos de restitución.',
            'financial', 5, 3
        ) RETURNING id INTO v_risk_legal_id;

        -- Riesgo: Mercado
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_real_estate_id,
            'Fluctuación del Mercado Inmobiliario',
            'Riesgo de pérdida de valor de los activos, vacancia prolongada de inmuebles o cambios en las tasas de interés (créditos hipotecarios).',
            'strategic', 3, 3
        ) RETURNING id INTO v_risk_market_id;


        -- 4. Insertar Preguntas de Identificación de Riesgos
        INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
        VALUES 
            (v_real_estate_id, '¿La empresa realiza intermediación en transacciones de compraventa superiores a $100,000 USD?', v_risk_aml_id),
            (v_real_estate_id, '¿Se aceptan pagos de comisiones o arras en efectivo?', v_risk_aml_id),
            (v_real_estate_id, '¿Se gestionan poderes o mandatos legales en nombre de propietarios ausentes o extranjeros?', v_risk_fraud_id),
            (v_real_estate_id, '¿La empresa administra directamente contratos de arrendamiento y recauda cánones?', v_risk_legal_id),
            (v_real_estate_id, '¿La empresa construye o compra bienes raíces para su propio portafolio de inversión?', v_risk_market_id);

        
        -- 5. Crear Lista de Chequeo de Auditoría
        INSERT INTO public.audit_checklists (name, description, sector_id)
        VALUES (
            'Auditoría Inmobiliaria y Cumplimiento Legal',
            'Evaluación de controles legales, financieros y de prevención de lavado de activos para agencias inmobiliarias.',
            v_real_estate_id
        ) RETURNING id INTO v_checklist_id;

        -- 6. Insertar Ítems de Auditoría Inmobiliaria
        IF v_checklist_id IS NOT NULL THEN
            INSERT INTO public.audit_checklist_items (checklist_id, category, question, requirement_code)
            VALUES 
                (v_checklist_id, 'PREVENCIÓN DE FRAUDE Y LAFT', '¿Se cuenta con un manual SIPLAFT / SARLAFT documentado y aprobado por la gerencia?', 'INM-001'),
                (v_checklist_id, 'PREVENCIÓN DE FRAUDE Y LAFT', '¿Se consulta a los clientes (compradores y vendedores) en listas restrictivas (ej. OFAC) antes de firmar contratos?', 'INM-002'),
                (v_checklist_id, 'LEGAL Y CONTRACTUAL', '¿Se realiza un Estudio de Títulos completo antes de iniciar la comercialización de un inmueble?', 'INM-003'),
                (v_checklist_id, 'LEGAL Y CONTRACTUAL', '¿Se exigen pólizas de seguro de arrendamiento o fiadores solidarios verificados para contratos de renta?', 'INM-004'),
                (v_checklist_id, 'GESTIÓN COMERCIAL', '¿Existen políticas claras sobre la devolución de arras o anticipos en caso de retracto?', 'INM-005'),
                (v_checklist_id, 'PROTECCIÓN DE DATOS', '¿Se firman acuerdos de protección de datos (Habeas Data) con todos los clientes y prospectos?', 'INM-006');
        END IF;

    END IF;
END $$;
