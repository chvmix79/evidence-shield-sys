-- ==============================================================================
-- Migración: Separación de Sectores Agrupados (Agropecuario/Alimentos y Energía/Recursos Naturales)
-- Descripción:
-- 1. Renombra 'Agropecuario y Alimentos' a 'Agropecuario'.
-- 2. Crea el nuevo sector 'Alimentos y Bebidas'.
-- 3. Renombra 'Energía y Recursos Naturales' a 'Energía'.
-- 4. Crea el nuevo sector 'Minería y Extracción'.
-- 5. Inserta plantillas básicas para los nuevos sectores independientes.
-- ==============================================================================

DO $$
DECLARE
    v_agro_id UUID;
    v_food_id UUID;
    v_energy_id UUID;
    v_mining_id UUID;

    v_risk_food_bio UUID;
    v_risk_food_recall UUID;
    v_risk_mining_env UUID;
    v_risk_mining_safety UUID;
BEGIN
    -- ======================================================
    -- 1. Separación de Agropecuario y Alimentos
    -- ======================================================
    
    -- Renombrar sector existente
    UPDATE public.sectors 
    SET name = 'Agropecuario', description = 'Agricultura, ganadería, silvicultura y pesca'
    WHERE name ILIKE '%Agropecuario%Alimentos%'
    RETURNING id INTO v_agro_id;

    -- Crear nuevo sector: Alimentos y Bebidas
    SELECT id INTO v_food_id FROM public.sectors WHERE name = 'Alimentos y Bebidas' LIMIT 1;
    IF v_food_id IS NULL THEN
        INSERT INTO public.sectors (name, description, icon)
        VALUES ('Alimentos y Bebidas', 'Procesamiento de alimentos, restaurantes, catering y bebidas', 'utensils')
        RETURNING id INTO v_food_id;
    END IF;

    -- Insertar riesgos para Alimentos y Bebidas
    IF v_food_id IS NOT NULL THEN
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_food_id, 'Contaminación Biológica de Alimentos', 
            'Riesgo de proliferación de bacterias o patógenos por pérdida de cadena de frío o mala manipulación.',
            'operational', 4, 5
        ) RETURNING id INTO v_risk_food_bio;

        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_food_id, 'Recall y Retiro de Producto', 
            'Riesgo de quejas masivas, multas sanitarias y retiro forzoso de productos del mercado.',
            'legal', 3, 5
        ) RETURNING id INTO v_risk_food_recall;

        -- Preguntas de Identificación para Alimentos
        INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
        VALUES 
            (v_food_id, '¿La empresa procesa, empaca o distribuye alimentos perecederos?', v_risk_food_bio),
            (v_food_id, '¿La empresa vende productos de consumo masivo con registro sanitario INVIMA/FDA?', v_risk_food_recall);
    END IF;

    -- ======================================================
    -- 2. Separación de Energía y Recursos Naturales
    -- ======================================================
    
    -- Renombrar sector existente
    UPDATE public.sectors 
    SET name = 'Energía', description = 'Generación, transmisión, distribución y comercialización de energía'
    WHERE name ILIKE '%Energía%Recursos Naturales%'
    RETURNING id INTO v_energy_id;

    -- Crear nuevo sector: Minería y Extracción
    SELECT id INTO v_mining_id FROM public.sectors WHERE name = 'Minería y Extracción' LIMIT 1;
    IF v_mining_id IS NULL THEN
        INSERT INTO public.sectors (name, description, icon)
        VALUES ('Minería y Extracción', 'Explotación minera, petróleo, gas y canteras', 'hammer')
        RETURNING id INTO v_mining_id;
    END IF;

    -- Insertar riesgos para Minería y Extracción
    IF v_mining_id IS NOT NULL THEN
        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_mining_id, 'Derrame y Contaminación Ambiental', 
            'Riesgo de contaminación de fuentes hídricas o suelos por vertimientos no controlados o fallas operativas.',
            'operational', 3, 5
        ) RETURNING id INTO v_risk_mining_env;

        INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact)
        VALUES (
            v_mining_id, 'Colapso Estructural y Accidentes Mineros', 
            'Riesgo de fatalidades por derrumbes, explosiones de gas o fallas en maquinaria pesada.',
            'security', 2, 5
        ) RETURNING id INTO v_risk_mining_safety;

        -- Preguntas de Identificación para Minería
        INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
        VALUES 
            (v_mining_id, '¿La empresa realiza extracción de minerales o hidrocarburos?', v_risk_mining_env),
            (v_mining_id, '¿El personal opera bajo tierra (socavones) o con explosivos?', v_risk_mining_safety);
    END IF;

END $$;
