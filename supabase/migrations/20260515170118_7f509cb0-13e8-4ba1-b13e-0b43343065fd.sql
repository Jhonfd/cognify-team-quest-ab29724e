
CREATE OR REPLACE VIEW public.profile_names
WITH (security_invoker = false) AS
SELECT user_id, name FROM public.profiles;

GRANT SELECT ON public.profile_names TO authenticated;
