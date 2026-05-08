-- 1. Add provider_token to actions
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS provider_token UUID UNIQUE DEFAULT gen_random_uuid();

-- 2. Webhooks Tables
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users on their webhooks" ON public.webhooks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on webhooks" ON public.webhooks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on webhooks" ON public.webhooks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on webhooks" ON public.webhooks
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Storage Bucket for External Provider Uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('provider_uploads', 'provider_uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload to provider_uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'provider_uploads');

CREATE POLICY "Anyone can read from provider_uploads" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'provider_uploads');

-- 4. RPC Functions (Security Definer to bypass RLS for external providers)
CREATE OR REPLACE FUNCTION get_action_by_token(p_token UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action json;
BEGIN
  SELECT row_to_json(a) INTO v_action
  FROM (
    SELECT act.id, act.description, act.due_date, act.status, act.provider_token, act.owner_id,
           r.name as risk_name
    FROM public.actions act
    LEFT JOIN public.risks r ON act.risk_id = r.id
    WHERE act.provider_token = p_token
  ) a;
  
  RETURN v_action;
END;
$$;

CREATE OR REPLACE FUNCTION submit_provider_evidence(p_token UUID, p_file_url TEXT, p_file_name TEXT, p_file_type TEXT, p_file_size INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action_id UUID;
  v_risk_id UUID;
  v_owner_id UUID;
BEGIN
  SELECT id, risk_id, owner_id INTO v_action_id, v_risk_id, v_owner_id
  FROM public.actions
  WHERE provider_token = p_token;
  
  IF v_action_id IS NULL THEN RETURN false; END IF;
  
  -- Insert into evidences table
  INSERT INTO public.evidences (action_id, risk_id, owner_id, file_url, name, file_type, file_size)
  VALUES (v_action_id, v_risk_id, v_owner_id, p_file_url, p_file_name, p_file_type, p_file_size);
  
  -- Automatically complete the action
  UPDATE public.actions SET status = 'completed' WHERE id = v_action_id;
  
  RETURN true;
END;
$$;
