-- =====================================================
-- SECTORES, NORMATIVAS Y PLANTILLAS DE RIESGOS
-- =====================================================

-- SECTORES / INDUSTRIAS
DROP TABLE IF EXISTS public.sectors CASCADE;
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar sectores principales
INSERT INTO public.sectors (name, description, icon) VALUES
('Aduanas y Logística', 'Agencias de aduanas, operadores logísticos, transportistas', 'truck'),
('Salud', 'Hospitales, clínicas, laboratorios, farmacias', 'heart-pulse'),
('Banca y Finanzas', 'Bancos, aseguradoras, fondos de inversión', 'landmark'),
('Tecnología', 'Desarrollo de software, servicios IT, data centers', 'laptop'),
('Manufactura', 'Industria manufacturera, producción, ensamblaje', 'factory'),
('Retail', 'Comercio minorista, tiendas, restaurantes', 'shopping-cart'),
('Educación', 'Universidades, colegios, institutos de formación', 'graduation-cap'),
('Construcción', 'Arquitectura, ingeniería civil, contratistas', 'hammer'),
('Energía', 'Generación, distribución y venta de energía', 'zap'),
('Telecomunicaciones', 'Operadores de telecom, ISPs, cableoperadoras', 'signal'),
('Alimentos', 'Procesamiento de alimentos, restaurantes, catering', 'utensils'),
('Inmobiliario', 'Bienes raíces, corretaje, property management', 'building');

-- NORMATIVAS / ESTÁNDARES POR SECTOR
DROP TABLE IF EXISTS public.standards CASCADE;
CREATE TABLE public.standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  country TEXT,
  is_mandatory BOOLEAN DEFAULT FALSE,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLANTILLAS DE RIESGOS POR SECTOR
DROP TABLE IF EXISTS public.risk_templates CASCADE;
CREATE TABLE public.risk_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type public.risk_type NOT NULL DEFAULT 'operational',
  probability SMALLINT DEFAULT 3,
  impact SMALLINT DEFAULT 3,
  standard_id UUID REFERENCES public.standards(id),
  recommended_actions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar plantillas de riesgos por sector

-- SECTOR: Aduanas y Logística (OEA, BASC)
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'Operador Económico Autorizado', 'OEA', 'Estándar de seguridad de la cadena logística', 'Internacional', true FROM public.sectors WHERE name = 'Aduanas y Logística';
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'Business Alliance for Secure Commerce', 'BASC', 'Estándar de seguridad para comercio internacional', 'Internacional', true FROM public.sectors WHERE name = 'Aduanas y Logística';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Control de carga y mercancía',
  'Riesgo de adulteración, robo o extravío de mercancía en custodia',
  'operational',
  3, 4,
  'Implementar sellos de seguridad, controles de inventario, capacitación en control de carga',
  true
FROM public.sectors s WHERE s.name = 'Aduanas y Logística';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Cumplimiento normativo OEA',
  'Incumplimiento de requisitos Operador Económico Autorizado',
  'legal',
  2, 5,
  'Auditorías internas, actualizar documentación, capacitación de personal',
  true
FROM public.sectors s WHERE s.name = 'Aduanas y Logística';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Seguridad en cadena de suministro',
  'Vulnerabilidad en la cadena de suministro por factores externos',
  'security',
  3, 4,
  'Verificación de proveedores, controles de acceso, sistemas de monitoreo',
  true
FROM public.sectors s WHERE s.name = 'Aduanas y Logística';

-- SECTOR: Salud
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'Norma ISO 13485', 'ISO 13485', 'Sistemas de gestión de calidad para dispositivos médicos', 'Internacional', true FROM public.sectors WHERE name = 'Salud';
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'Norma ISO 15189', 'ISO 15189', 'Requisitos para laboratorios de análisis clínicos', 'Internacional', true FROM public.sectors WHERE name = 'Salud';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Control de infecciones',
  'Riesgo de contaminación cruzada o brotes hospitalarios',
  'operational',
  3, 5,
  'Protocolos de higiene, capacitación en bioseguridad, auditorías de limpieza',
  true
FROM public.sectors s WHERE s.name = 'Salud';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Datos de pacientes',
  'Exposición de información sensible de pacientes',
  'security',
  2, 5,
  'Cifrado de datos, controles de acceso, cumplimiento de HIPAA/LGPD',
  true
FROM public.sectors s WHERE s.name = 'Salud';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Dispositivos médicos',
  'Fallas en equipos médicos que puedan afectar la seguridad del paciente',
  'operational',
  2, 5,
  'Mantenimiento preventivo, controles de calibración, capacitación de usuarios',
  true
FROM public.sectors s WHERE s.name = 'Salud';

-- SECTOR: Banca y Finanzas
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'Norma ISO 27001', 'ISO 27001', 'Sistemas de gestión de seguridad de información', 'Internacional', true FROM public.sectors WHERE name = 'Banca y Finanzas';
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'PCI DSS', 'PCI DSS', 'Estándar de seguridad para datos de tarjetas de pago', 'Internacional', true FROM public.sectors WHERE name = 'Banca y Finanzas';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Fraude financiero',
  'Estafas, phishing, accesos no autorizados a cuentas',
  'financial',
  3, 5,
  'Autenticación multifactor, monitoreo de transacciones, capacitación anti-fraude',
  true
FROM public.sectors s WHERE s.name = 'Banca y Finanzas';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Lavado de dinero',
  'Riesgo de lavado de dinero o financiamiento del terrorismo',
  'legal',
  2, 5,
  'KYC, monitoreo de transacciones sospechosas, reporte de operaciones',
  true
FROM public.sectors s WHERE s.name = 'Banca y Finanzas';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Ciberseguridad bancaria',
  'Ataques cibernéticos a sistemas de banca en línea',
  'security',
  3, 5,
  'Firewalls, sistemas de detección de intrusiones, pruebas de penetración',
  true
FROM public.sectors s WHERE s.name = 'Banca y Finanzas';

-- SECTOR: Tecnología
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'ISO/IEC 27001', 'ISO 27001', 'Gestión de seguridad de la información', 'Internacional', true FROM public.sectors WHERE name = 'Tecnología';
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'SOC 2', 'SOC 2', 'Controles de seguridad en servicios tecnológicos', 'EE.UU.', false FROM public.sectors WHERE name = 'Tecnología';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Vulnerabilidades de software',
  'Fallos de seguridad en aplicaciones desarrolladas',
  'security',
  3, 4,
  'Code review, pruebas de seguridad, actualización de dependencias',
  true
FROM public.sectors s WHERE s.name = 'Tecnología';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Pérdida de datos',
  'Pérdida o corrupción de datos por fallos técnicos',
  'operational',
  2, 5,
  'Backups regulares, recuperación ante desastres, pruebas de restauración',
  true
FROM public.sectors s WHERE s.name = 'Tecnología';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Incumplimiento de privacidad',
  'Violación de normativas de protección de datos',
  'legal',
  2, 4,
  'Evaluaciones de impacto, políticas de privacidad, designación de DPO',
  true
FROM public.sectors s WHERE s.name = 'Tecnología';

-- SECTOR: Manufactura
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'ISO 45001', 'ISO 45001', 'Sistemas de gestión de seguridad y salud ocupacional', 'Internacional', true FROM public.sectors WHERE name = 'Manufactura';
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'ISO 14001', 'ISO 14001', 'Sistemas de gestión ambiental', 'Internacional', false FROM public.sectors WHERE name = 'Manufactura';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Accidentes laborales',
  'Lesiones o accidentes en planta de producción',
  'operational',
  3, 5,
  'EPIs, capacitación en seguridad, protocolos de emergencia, inspecciones',
  true
FROM public.sectors s WHERE s.name = 'Manufactura';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Contaminación ambiental',
  'Emisiones, derrames o residuos que impacten el ambiente',
  'operational',
  2, 4,
  'Gestión de residuos, mantenimiento de equipos, auditorías ambientales',
  true
FROM public.sectors s WHERE s.name = 'Manufactura';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Interrupción de producción',
  'Paros no planificados por fallas en equipos o suministro',
  'operational',
  3, 4,
  'Mantenimiento preventivo, inventario de repuestos, contratos de servicio',
  true
FROM public.sectors s WHERE s.name = 'Manufactura';

-- SECTOR: Educación
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'ISO 21001', 'ISO 21001', 'Sistemas de gestión para organizaciones educativas', 'Internacional', false FROM public.sectors WHERE name = 'Educación';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Seguridad de estudiantes',
  'Riesgos de seguridad en instalaciones educativas',
  'security',
  2, 5,
  'Control de acceso, vigilancia, protocolos de emergencia, capacitación',
  true
FROM public.sectors s WHERE s.name = 'Educación';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Datos de estudiantes',
  'Protección de información personal de estudiantes menores',
  'legal',
  2, 4,
  'Políticas de privacidad, consentimiento parental, controles de acceso',
  true
FROM public.sectors s WHERE s.name = 'Educación';

-- SECTOR: Construcción
INSERT INTO public.standards (sector_id, name, code, description, country, is_mandatory) 
SELECT id, 'ISO 45001', 'ISO 45001', 'Seguridad y salud ocupacional en obra', 'Internacional', true FROM public.sectors WHERE name = 'Construcción';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Accidentes en obra',
  'Caídas, atrapamientos, golpes en sitio de construcción',
  'operational',
  4, 5,
  'Equipos de protección, barreras de seguridad, capacitación, supervisión constante',
  true
FROM public.sectors s WHERE s.name = 'Construcción';

INSERT INTO public.risk_templates (sector_id, name, description, type, probability, impact, recommended_actions, is_active)
SELECT 
  s.id,
  'Incendio en obra',
  'Riesgo de incendios por materiales inflamables',
  'operational',
  3, 4,
  'Extintores, señalización, planes de evacuación, capacitación',
  true
FROM public.sectors s WHERE s.name = 'Construcción';

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para todas las tablas nuevas
CREATE POLICY "Anyone can view sectors" ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view standards" ON public.standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view risk templates" ON public.risk_templates FOR SELECT TO authenticated USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins can manage sectors" ON public.sectors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage standards" ON public.standards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage risk templates" ON public.risk_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

SELECT 'Sectores, normativas y plantillas configurados correctamente!' AS status;
