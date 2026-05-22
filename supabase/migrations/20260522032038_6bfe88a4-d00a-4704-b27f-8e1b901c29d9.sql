-- Trigger-only functions: no one needs EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- has_role: used by RLS policies (runs as definer regardless) and by server fns as authenticated user
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- get_biblioteca_areas_counts: read-only, only signed-in users need it
REVOKE ALL ON FUNCTION public.get_biblioteca_areas_counts(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_biblioteca_areas_counts(text) TO authenticated;