-- Lookup whether an email already exists in auth.users.
-- Callable only with the service_role key (Edge Functions), never from anon/authenticated clients.
-- Apply in Supabase SQL editor or via drizzle migration 0016_is_email_registered.sql.

CREATE OR REPLACE FUNCTION public.is_email_registered(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_registered(text) TO service_role;
