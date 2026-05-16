ALTER FUNCTION public.get_biblioteca_counts() SECURITY INVOKER;
ALTER FUNCTION public.get_biblioteca_areas(text) SECURITY INVOKER;
ALTER FUNCTION public.get_biblioteca_books(text, text, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_biblioteca_book(text, bigint) SECURITY INVOKER;