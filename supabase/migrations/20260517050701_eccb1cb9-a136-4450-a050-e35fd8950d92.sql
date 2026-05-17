-- Allow authenticated users to evaluate role-based RLS policies
-- This fixes "permission denied for function has_role" when the app checks admin access.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Keep the function callable by database roles used by RLS checks without exposing write access.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;