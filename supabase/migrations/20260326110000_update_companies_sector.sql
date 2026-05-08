-- =====================================================
-- ACTUALIZAR TABLA COMPANIES CON SECTOR_ID
-- =====================================================

-- Agregar columna sector_id a companies
ALTER TABLE public.companies 
ADD COLUMN sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por sector
CREATE INDEX IF NOT EXISTS idx_companies_sector_id ON public.companies(sector_id);

-- Migrar datos existentes de sector (texto) a sector_id
UPDATE public.companies c
SET sector_id = s.id
FROM public.sectors s
WHERE LOWER(c.sector) = LOWER(s.name);

-- Hacer sector_id obligatorio después de la migración
ALTER TABLE public.companies ALTER COLUMN sector_id SET NOT NULL;

SELECT 'Tabla companies actualizada con sector_id' AS status;
