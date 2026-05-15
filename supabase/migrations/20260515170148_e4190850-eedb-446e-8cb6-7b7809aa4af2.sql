
DROP VIEW IF EXISTS public.profile_names;

CREATE OR REPLACE FUNCTION public.get_profile_names()
RETURNS TABLE (user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, name FROM public.profiles;
$$;

REVOKE ALL ON FUNCTION public.get_profile_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_names() TO authenticated;
