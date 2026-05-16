
ALTER TABLE public.provas_oab ADD COLUMN IF NOT EXISTS numero_romano text;

CREATE OR REPLACE FUNCTION public.int_to_roman(num integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  vals int[] := ARRAY[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  syms text[] := ARRAY['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  result text := '';
  i int;
BEGIN
  IF num IS NULL OR num <= 0 THEN RETURN NULL; END IF;
  FOR i IN 1..array_length(vals,1) LOOP
    WHILE num >= vals[i] LOOP
      result := result || syms[i];
      num := num - vals[i];
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$;

UPDATE public.provas_oab
SET titulo = numero || 'º EXAME DE ORDEM UNIFICADO',
    numero_romano = public.int_to_roman(numero);
