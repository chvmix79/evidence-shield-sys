-- =====================================================
-- REPARACIÓN RLS Y MULTI-EMPRESA
-- Fecha: 2026-04-09
-- =====================================================

-- =====================================================
-- 1. CREAR TABLA company_users (si no existe)
-- =====================================================
DROP TABLE IF EXISTS public.company_users CASCADE;
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- =====================================================
-- 2. HABILITAR RLS EN company_users
-- =====================================================
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS RLS PARA company_users
-- =====================================================

-- Cualquier usuario autenticado puede ver sus propias asignaciones
DROP POLICY IF EXISTS "Users can view own company assignments" ON public.company_users;
CREATE POLICY "Users can view own company assignments" ON public.company_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Usuarios pueden ver asignaciones de su empresa (si son owner o admin)
DROP POLICY IF EXISTS "Company owners can view assignments" ON public.company_users;
CREATE POLICY "Company owners can view assignments" ON public.company_users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Solo admins pueden insertar asignaciones
DROP POLICY IF EXISTS "Admins can manage company assignments" ON public.company_users;
CREATE POLICY "Admins can manage company assignments" ON public.company_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. ACTUALIZAR POLÍTICAS DE risks PARA USAR company_users
-- =====================================================

-- Actualizar política de SELECT para risks - ahora incluye miembros de company_users
DROP POLICY IF EXISTS "View risks" ON public.risks;
CREATE POLICY "View risks" ON public.risks FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = risks.company_id AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = risks.company_id AND c.owner_id = auth.uid()
    )
  );

-- Actualizar política de INSERT para risks
DROP POLICY IF EXISTS "Insert risks" ON public.risks;
CREATE POLICY "Insert risks" ON public.risks FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = risks.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

-- Actualizar política de UPDATE para risks
DROP POLICY IF EXISTS "Update risks" ON public.risks;
CREATE POLICY "Update risks" ON public.risks FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = risks.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

-- Actualizar política de DELETE para risks
DROP POLICY IF EXISTS "Delete risks" ON public.risks;
CREATE POLICY "Delete risks" ON public.risks FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- 5. ACTUALIZAR POLÍTICAS DE companies PARA USAR company_users
-- =====================================================

-- Los miembros de company_users pueden ver empresas
DROP POLICY IF EXISTS "View companies" ON public.companies;
CREATE POLICY "View companies" ON public.companies FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = companies.id AND cu.user_id = auth.uid()
    )
  );

-- Los managers de company_users pueden insertar companies
DROP POLICY IF EXISTS "Insert companies" ON public.companies;
CREATE POLICY "Insert companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Los managers de company_users pueden actualizar companies
DROP POLICY IF EXISTS "Update companies" ON public.companies;
CREATE POLICY "Update companies" ON public.companies FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = companies.id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

-- =====================================================
-- 6. ACTUALIZAR POLÍTICAS DE actions PARA USAR company_users
-- =====================================================

DROP POLICY IF EXISTS "View actions" ON public.actions;
CREATE POLICY "View actions" ON public.actions FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = actions.risk_id AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert actions" ON public.actions;
CREATE POLICY "Insert actions" ON public.actions FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = actions.risk_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

DROP POLICY IF EXISTS "Update actions" ON public.actions;
CREATE POLICY "Update actions" ON public.actions FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = actions.risk_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

DROP POLICY IF EXISTS "Delete actions" ON public.actions;
CREATE POLICY "Delete actions" ON public.actions FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- 7. ACTUALIZAR POLÍTICAS DE evidences PARA USAR company_users
-- =====================================================

DROP POLICY IF EXISTS "View evidences" ON public.evidences;
CREATE POLICY "View evidences" ON public.evidences FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = evidences.risk_id AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert evidences" ON public.evidences;
CREATE POLICY "Insert evidences" ON public.evidences FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = evidences.risk_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

DROP POLICY IF EXISTS "Update evidences" ON public.evidences;
CREATE POLICY "Update evidences" ON public.evidences FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      JOIN public.risks r ON r.company_id = cu.company_id
      WHERE r.id = evidences.risk_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('editor', 'manager')
    )
  );

DROP POLICY IF EXISTS "Delete evidences" ON public.evidences;
CREATE POLICY "Delete evidences" ON public.evidences FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- 8. ACTUALIZAR POLÍTICAS DE alerts PARA USAR company_users
-- =====================================================

DROP POLICY IF EXISTS "View alerts" ON public.alerts;
CREATE POLICY "View alerts" ON public.alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = alerts.company_id
        AND (
          c.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'auditor')
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = c.id AND cu.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Insert alerts" ON public.alerts;
CREATE POLICY "Insert alerts" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = alerts.company_id
        AND (
          c.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = c.id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('editor', 'manager')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Update alerts" ON public.alerts;
CREATE POLICY "Update alerts" ON public.alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = alerts.company_id
        AND (
          c.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = c.id
              AND cu.user_id = auth.uid()
              AND cu.role IN ('editor', 'manager')
          )
        )
    )
  );

-- =====================================================
-- 9. ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_risks_company_id ON public.risks(company_id);

-- =====================================================
-- FIN
-- =====================================================
SELECT 'RLS y Multi-empresa configurados correctamente!' AS status;
