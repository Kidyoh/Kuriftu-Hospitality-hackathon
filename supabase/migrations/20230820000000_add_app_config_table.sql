-- Create app_config table for storing application configurations
CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(255) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function on update
DROP TRIGGER IF EXISTS set_app_config_updated_at ON public.app_config;
CREATE TRIGGER set_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION update_app_config_updated_at();

-- Add RLS policies for the app_config table
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only allow admins to modify app_config entries
DROP POLICY IF EXISTS app_config_admin_select ON public.app_config;
CREATE POLICY app_config_admin_select ON public.app_config 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS app_config_admin_insert ON public.app_config;
CREATE POLICY app_config_admin_insert ON public.app_config 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS app_config_admin_update ON public.app_config;
CREATE POLICY app_config_admin_update ON public.app_config 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS app_config_admin_delete ON public.app_config;
CREATE POLICY app_config_admin_delete ON public.app_config 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add a function to safely get app config values
CREATE OR REPLACE FUNCTION get_app_config(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT config_value INTO v_value
  FROM public.app_config
  WHERE config_key = p_key;
  
  RETURN v_value;
END;
$$; 