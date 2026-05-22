ALTER TABLE public.aulas_interativas_slides DROP CONSTRAINT IF EXISTS aulas_interativas_slides_tipo_check;
ALTER TABLE public.aulas_interativas_slides ADD CONSTRAINT aulas_interativas_slides_tipo_check
  CHECK (tipo = ANY (ARRAY['capa','conceito','exemplo','esquema','comparativo','quiz','resumo','conclusao','mapa_mental','ligar_termos','dicas','caso_pratico']));