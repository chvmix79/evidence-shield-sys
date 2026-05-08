-- Migration: Create audits table
-- This table stores audit records for companies

-- Create enum for audit status
CREATE TYPE public.audit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Create audits table
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.audit_status NOT NULL DEFAULT 'scheduled',
  description TEXT,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_audits_company_id ON public.audits(company_id);
CREATE INDEX idx_audits_auditor_id ON public.audits(auditor_id);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audits_start_date ON public.audits(start_date);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS

-- Policy: Users can view audits for companies they own or if they are the auditor
CREATE POLICY "Users can view audits for their companies or as auditor"
  ON public.audits FOR SELECT
  USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
    OR auditor_id = auth.uid()
  );

-- Policy: Admins can view all audits
CREATE POLICY "Admins can view all audits"
  ON public.audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Auditors can view audits assigned to them
CREATE POLICY "Auditors can view assigned audits"
  ON public.audits FOR SELECT
  USING (
    auditor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'auditor'
    )
  );

-- Policy: Users can insert audits for their companies
CREATE POLICY "Users can insert audits for their companies"
  ON public.audits FOR INSERT
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Policy: Users can update audits for their companies or as auditor
CREATE POLICY "Users can update audits for their companies or as auditor"
  ON public.audits FOR UPDATE
  USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
    OR auditor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can delete audits
CREATE POLICY "Only admins can delete audits"
  ON public.audits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_audits_updated
  BEFORE UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to table
COMMENT ON TABLE public.audits IS 'Stores audit records for companies with scheduling and findings';
COMMENT ON COLUMN public.audits.title IS 'Title/name of the audit';
COMMENT ON COLUMN public.audits.company_id IS 'Reference to the company being audited';
COMMENT ON COLUMN public.audits.auditor_id IS 'Reference to the user performing the audit';
COMMENT ON COLUMN public.audits.status IS 'Current status: scheduled, in_progress, completed, or cancelled';
COMMENT ON COLUMN public.audits.findings IS 'Audit findings and observations';
COMMENT ON COLUMN public.audits.recommendations IS 'Recommendations based on audit findings';