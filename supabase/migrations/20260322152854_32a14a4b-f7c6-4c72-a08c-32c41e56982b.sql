
-- Fix: set search_path on update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Fix: tighten the permissive INSERT policy on alerts
-- Only company owners and admins can create alerts for their companies
DROP POLICY IF EXISTS "Insert alerts" ON public.alerts;
CREATE POLICY "Insert alerts" ON public.alerts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
