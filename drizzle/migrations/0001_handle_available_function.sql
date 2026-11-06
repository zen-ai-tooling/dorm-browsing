CREATE OR REPLACE FUNCTION public.handle_available(_handle text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE handle = lower(_handle))
$$;
GRANT EXECUTE ON FUNCTION public.handle_available(text) TO authenticated;