-- =====================================================
-- EVIDENCE SHIELD SYS - DATABASE SETUP
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.risk_type CASCADE;
DROP TYPE IF EXISTS public.risk_status CASCADE;
DROP TYPE IF EXISTS public.action_status CASCADE;

CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'auditor');
CREATE TYPE public.risk_type AS ENUM ('operational', 'legal', 'financial', 'security');
CREATE TYPE public.risk_status AS ENUM ('active', 'mitigated');
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'completed');

-- =====================================================
-- TABLES
-- =====================================================

-- USER ROLES
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- PROFILES
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANIES
DROP TABLE IF EXISTS public.companies CASCADE;
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT,
  employee_count INTEGER,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RISKS
DROP TABLE IF EXISTS public.risks CASCADE;
CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type risk_type NOT NULL DEFAULT 'operational',
  probability SMALLINT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  risk_level INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  status risk_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIONS
DROP TABLE IF EXISTS public.actions CASCADE;
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible TEXT NOT NULL,
  due_date DATE,
  status action_status NOT NULL DEFAULT 'pending',
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVIDENCES
DROP TABLE IF EXISTS public.evidences CASCADE;
CREATE TABLE public.evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID REFERENCES public.risks(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.actions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALERTS
DROP TABLE IF EXISTS public.alerts CASCADE;
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue_action', 'critical_risk', 'missing_evidence')),
  title TEXT NOT NULL,
  description TEXT,
  risk_id UUID REFERENCES public.risks(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.actions(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- companies policies
DROP POLICY IF EXISTS "View companies" ON public.companies;
CREATE POLICY "View companies" ON public.companies FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor'));

DROP POLICY IF EXISTS "Insert companies" ON public.companies;
CREATE POLICY "Insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Update companies" ON public.companies;
CREATE POLICY "Update companies" ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Delete companies" ON public.companies;
CREATE POLICY "Delete companies" ON public.companies FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- risks policies
DROP POLICY IF EXISTS "View risks" ON public.risks;
CREATE POLICY "View risks" ON public.risks FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor'));

DROP POLICY IF EXISTS "Insert risks" ON public.risks;
CREATE POLICY "Insert risks" ON public.risks FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Update risks" ON public.risks;
CREATE POLICY "Update risks" ON public.risks FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Delete risks" ON public.risks;
CREATE POLICY "Delete risks" ON public.risks FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- actions policies
DROP POLICY IF EXISTS "View actions" ON public.actions;
CREATE POLICY "View actions" ON public.actions FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor'));

DROP POLICY IF EXISTS "Insert actions" ON public.actions;
CREATE POLICY "Insert actions" ON public.actions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Update actions" ON public.actions;
CREATE POLICY "Update actions" ON public.actions FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Delete actions" ON public.actions;
CREATE POLICY "Delete actions" ON public.actions FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- evidences policies
DROP POLICY IF EXISTS "View evidences" ON public.evidences;
CREATE POLICY "View evidences" ON public.evidences FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor'));

DROP POLICY IF EXISTS "Insert evidences" ON public.evidences;
CREATE POLICY "Insert evidences" ON public.evidences FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Update evidences" ON public.evidences;
CREATE POLICY "Update evidences" ON public.evidences FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Delete evidences" ON public.evidences;
CREATE POLICY "Delete evidences" ON public.evidences FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- alerts policies
DROP POLICY IF EXISTS "View alerts" ON public.alerts;
CREATE POLICY "View alerts" ON public.alerts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')))
);

DROP POLICY IF EXISTS "Insert alerts" ON public.alerts;
CREATE POLICY "Insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

DROP POLICY IF EXISTS "Update alerts" ON public.alerts;
CREATE POLICY "Update alerts" ON public.alerts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- storage policies
DROP POLICY IF EXISTS "Upload evidences" ON storage.objects;
CREATE POLICY "Upload evidences" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidences');

DROP POLICY IF EXISTS "View evidences storage" ON storage.objects;
CREATE POLICY "View evidences storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidences');

DROP POLICY IF EXISTS "Delete own evidences" ON storage.objects;
CREATE POLICY "Delete own evidences" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_risks_updated_at ON public.risks;
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_actions_updated_at ON public.actions;
CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- COMPLETADO
-- =====================================================
SELECT 'Base de datos configurada correctamente!' AS status;
