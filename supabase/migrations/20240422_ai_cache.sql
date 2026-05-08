-- Tabla para cachear análisis de IA y evitar errores 503
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, module_name)
);

-- Habilitar RLS
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Usuarios pueden ver análisis de sus empresas" 
ON public.ai_analyses FOR SELECT 
USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id));

CREATE POLICY "Usuarios pueden insertar análisis de sus empresas" 
ON public.ai_analyses FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE id = company_id));

CREATE POLICY "Usuarios pueden actualizar análisis de sus empresas" 
ON public.ai_analyses FOR UPDATE 
USING (EXISTS (SELECT 1 FROM companies WHERE id = company_id));
