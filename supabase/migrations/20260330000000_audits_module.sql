-- =====================================================
-- ADVANCED AUDITS MODULE
-- =====================================================

CREATE TYPE public.audit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.audit_finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.audit_finding_status AS ENUM ('open', 'resolved', 'closed');

-- AUDITS
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES auth.users(id),
  status audit_status NOT NULL DEFAULT 'scheduled',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT FINDINGS
CREATE TABLE public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity audit_finding_severity NOT NULL DEFAULT 'medium',
  status audit_finding_status NOT NULL DEFAULT 'open',
  risk_id UUID REFERENCES public.risks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

-- AUDITS POLICIES
CREATE POLICY "View audits" ON public.audits FOR SELECT TO authenticated USING (
  auditor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR 
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
);
CREATE POLICY "Insert audits" ON public.audits FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')
);
CREATE POLICY "Update audits" ON public.audits FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')
);
CREATE POLICY "Delete audits" ON public.audits FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')
);

-- AUDIT FINDINGS POLICIES
CREATE POLICY "View audit findings" ON public.audit_findings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.audits a WHERE a.id = audit_id AND (
      a.auditor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR 
      EXISTS (SELECT 1 FROM public.companies c WHERE c.id = a.company_id AND c.owner_id = auth.uid())
    )
  )
);
CREATE POLICY "Insert audit findings" ON public.audit_findings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND (a.auditor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')))
);
CREATE POLICY "Update audit findings" ON public.audit_findings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND (a.auditor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')))
);
CREATE POLICY "Delete audit findings" ON public.audit_findings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.audits a WHERE a.id = audit_id AND (a.auditor_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')))
);

-- TRIGGERS
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_audit_findings_updated_at BEFORE UPDATE ON public.audit_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
