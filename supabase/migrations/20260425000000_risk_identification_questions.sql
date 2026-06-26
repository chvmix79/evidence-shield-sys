-- 1. Create table for risk identification questions
CREATE TABLE IF NOT EXISTS public.risk_identification_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    trigger_risk_template_id UUID NOT NULL REFERENCES public.risk_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.risk_identification_questions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy
CREATE POLICY "Risk identification questions are viewable by everyone" 
ON public.risk_identification_questions 
FOR SELECT 
USING (true);

-- 4. Seed some initial questions based on sectors and templates
DO $$
DECLARE
    tech_sec_id UUID;
    health_sec_id UUID;
    fin_sec_id UUID;
    
    t_cyber_id UUID;
    t_data_id UUID;
    t_bio_id UUID;
    t_fraud_id UUID;
BEGIN
    -- Find sectors
    SELECT id INTO tech_sec_id FROM public.sectors WHERE name ILIKE '%Tecnología%' LIMIT 1;
    SELECT id INTO health_sec_id FROM public.sectors WHERE name ILIKE '%Salud%' LIMIT 1;
    SELECT id INTO fin_sec_id FROM public.sectors WHERE name ILIKE '%Financiero%' LIMIT 1;

    -- If sectors exist, find some templates to link
    IF tech_sec_id IS NOT NULL THEN
        SELECT id INTO t_cyber_id FROM public.risk_templates WHERE sector_id = tech_sec_id AND name ILIKE '%Ciberataque%' LIMIT 1;
        SELECT id INTO t_data_id FROM public.risk_templates WHERE sector_id = tech_sec_id AND name ILIKE '%Datos%' LIMIT 1;
        
        IF t_cyber_id IS NOT NULL THEN
            INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
            VALUES (tech_sec_id, '¿La empresa expone servicios o aplicaciones críticas directamente a Internet?', t_cyber_id);
        END IF;

        IF t_data_id IS NOT NULL THEN
            INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
            VALUES (tech_sec_id, '¿La empresa procesa o almacena datos personales sensibles de usuarios?', t_data_id);
        END IF;
    END IF;

    IF health_sec_id IS NOT NULL THEN
        SELECT id INTO t_bio_id FROM public.risk_templates WHERE sector_id = health_sec_id AND name ILIKE '%Biológico%' LIMIT 1;
        
        IF t_bio_id IS NOT NULL THEN
            INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
            VALUES (health_sec_id, '¿El personal tiene contacto directo con fluidos corporales o material biológico?', t_bio_id);
        END IF;
    END IF;

    IF fin_sec_id IS NOT NULL THEN
        SELECT id INTO t_fraud_id FROM public.risk_templates WHERE sector_id = fin_sec_id AND name ILIKE '%Fraude%' LIMIT 1;
        
        IF t_fraud_id IS NOT NULL THEN
            INSERT INTO public.risk_identification_questions (sector_id, question_text, trigger_risk_template_id)
            VALUES (fin_sec_id, '¿La empresa procesa transacciones monetarias en línea o gestiona fondos de terceros?', t_fraud_id);
        END IF;
    END IF;
END $$;
