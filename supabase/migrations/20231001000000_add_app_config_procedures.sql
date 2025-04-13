-- Create a function to safely set app configuration values
-- This allows bypassing direct table access and its RLS policies
CREATE OR REPLACE FUNCTION public.set_app_config(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the calling user has admin privileges in the profiles table
  IF EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    -- Upsert the configuration
    INSERT INTO public.app_config (config_key, config_value)
    VALUES (p_key, p_value)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
      config_value = p_value,
      updated_at = now();
  ELSE
    RAISE EXCEPTION 'Permission denied: only admins can update app configuration';
  END IF;
END;
$$;

-- Create a function to safely get app configuration values
-- This allows reading configuration without requiring special permissions
CREATE OR REPLACE FUNCTION public.get_app_config(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value jsonb;
BEGIN
  SELECT config_value INTO v_value
  FROM public.app_config
  WHERE config_key = p_key;
  
  RETURN v_value;
END;
$$; 