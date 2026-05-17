DO $$
DECLARE
  r RECORD;
  m TEXT[];
  prefix TEXT;
  paragrafo TEXT;
  sep TEXT;
  resto TEXT;
  padroes TEXT := '(olá|ol[aá] pessoal|pessoal|galera|turma|queridos? alunos?|sejam bem.?vindos?|bem.?vindos?|nesta aula|neste v[ií]deo|hoje vamos|vamos ver|vamos estudar|vamos analisar|vamos abordar|neste resumo (iremos|vamos)|come[çc]aremos|come[çc]ando)';
BEGIN
  FOR r IN
    SELECT id, conteudo_markdown
    FROM public.resumo_capitulos
    WHERE conteudo_markdown IS NOT NULL
      AND left(conteudo_markdown, 1200) ~* padroes
  LOOP
    -- captura: (H1 opcional + quebras)(primeiro parágrafo)(separador \n\n ou fim)
    m := regexp_match(
      r.conteudo_markdown,
      '^(\s*#[^\n]*\n+)?([^\n][^\n]*(?:\n[^\n][^\n]*)*)(\n{2,}|\s*$)',
      'n'
    );
    IF m IS NULL THEN CONTINUE; END IF;
    prefix    := COALESCE(m[1], '');
    paragrafo := COALESCE(m[2], '');
    sep       := COALESCE(m[3], '');

    IF paragrafo ~* padroes THEN
      resto := substring(
        r.conteudo_markdown
        FROM (length(prefix) + length(paragrafo) + length(sep) + 1)
      );
      UPDATE public.resumo_capitulos
      SET conteudo_markdown = prefix || COALESCE(resto, '')
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;