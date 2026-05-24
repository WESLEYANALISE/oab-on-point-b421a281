
ALTER TABLE public.vade_mecum_leis ADD COLUMN IF NOT EXISTS planalto_url text;

UPDATE public.vade_mecum_leis SET planalto_url = v.url FROM (VALUES
  ('cf',                          'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm'),
  ('cc',                          'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'),
  ('cp',                          'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm'),
  ('cpc',                         'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm'),
  ('cpp',                         'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm'),
  ('cdc',                         'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm'),
  ('clt',                         'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm'),
  ('ctn',                         'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm'),
  ('ce',                          'https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm'),
  ('ctb',                         'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm'),
  ('cpm',                         'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001compilado.htm'),
  ('cppm',                        'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm'),
  ('ccom',                        'https://www.planalto.gov.br/ccivil_03/leis/lim556compilado.htm'),
  ('cflo',                        'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm'),
  ('cba',                         'https://www.planalto.gov.br/ccivil_03/leis/l7565compilado.htm'),
  ('cbt',                         'https://www.planalto.gov.br/ccivil_03/leis/l4117.htm'),
  ('ccaca',                       'https://www.planalto.gov.br/ccivil_03/leis/l5197.htm'),
  ('cdm',                         'https://www.planalto.gov.br/ccivil_03/decreto-lei/del0227.htm'),
  ('cdus',                        'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm'),
  ('cpi',                         'https://www.planalto.gov.br/ccivil_03/leis/l9279.htm'),
  ('cpesca',                      'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11959.htm'),
  ('ca',                          'https://www.planalto.gov.br/ccivil_03/decreto/d24643.htm'),
  ('eca',                         'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm'),
  ('est-desarmamento',            'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm'),
  ('est-igualdade-racial',        'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12288.htm'),
  ('est-pessoa-c-deficiencia',    'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm'),
  ('estatuto-do-idoso',           'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm'),
  ('estatuto-da-cidade',          'https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm'),
  ('estatuto-oab',                'https://www.planalto.gov.br/ccivil_03/leis/l8906.htm'),
  ('estatuto-do-torcedor',        'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.671.htm'),
  ('est-juventude',               'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12852.htm'),
  ('est-indio',                   'https://www.planalto.gov.br/ccivil_03/leis/l6001.htm'),
  ('dec-1-171-etica-servidor',    'https://www.planalto.gov.br/ccivil_03/decreto/D1171.htm'),
  ('dl-3-688-contravencoes',      'https://www.planalto.gov.br/ccivil_03/decreto-lei/Del3688.htm'),
  ('lc-101-lrf',                  'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm'),
  ('lc-109-prev-compl',           'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp109.htm'),
  ('lc-135-ficha-limpa',          'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp135.htm'),
  ('lc-75-mp-uniao',              'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp75.htm'),
  ('lc-80-defensoria',            'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp80.htm'),
  ('lei-1-079-crimes-resp',       'https://www.planalto.gov.br/ccivil_03/leis/l1079.htm'),
  ('lei-10-520-pregao',           'https://www.planalto.gov.br/ccivil_03/leis/2002/l10520.htm'),
  ('lei-11-079-ppp',              'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11079.htm'),
  ('lei-11-101-falencias',        'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm'),
  ('lei-12-016-ms',               'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm'),
  ('lei-12-037-ident-criminal',   'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12037.htm'),
  ('lei-12-527-lai',              'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm'),
  ('lei-12-846-anticorrupcao',    'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm'),
  ('lei-12-850-org-crim',         'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm'),
  ('lei-13-104-feminicidio',      'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13104.htm'),
  ('lei-13-140-mediacao',         'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13140.htm'),
  ('lei-13-260-antiterrorismo',   'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13260.htm'),
  ('lei-13-869-abuso-aut',        'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm'),
  ('lei-14-133-licitacoes',       'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
  ('lei-14-197-estado-democr',    'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14197.htm'),
  ('lei-3-365-desapropriacao',    'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3365.htm'),
  ('lei-4-717-acao-popular',      'https://www.planalto.gov.br/ccivil_03/leis/l4717.htm')
) AS v(slug, url)
WHERE vade_mecum_leis.slug = v.slug;

CREATE OR REPLACE FUNCTION public.get_estatuto_overview(_slug text, _user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'lei', to_jsonb(l.*),
    'artigos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'numero', a.numero,
          'texto', a.texto,
          'ordem', a.ordem,
          'relevancia', a.relevancia,
          'relevancia_nota', a.relevancia_nota,
          'ult_alteracao_em', a.ult_alteracao_em,
          'revogado', a.revogado
        )
        order by a.ordem
      )
      from public.vade_mecum_artigos a
      where a.lei_id = l.id
    ), '[]'::jsonb),
    'favoritos', coalesce((
      select jsonb_agg(f.artigo_id)
      from public.vade_mecum_favoritos f
      where f.lei_id = l.id and _user_id is not null and f.user_id = _user_id
    ), '[]'::jsonb),
    'anotados', coalesce((
      select jsonb_agg(distinct n.artigo_id)
      from public.vade_mecum_anotacoes n
      where n.lei_id = l.id and _user_id is not null and n.user_id = _user_id
    ), '[]'::jsonb)
  )
  from public.vade_mecum_leis l
  where l.slug = _slug;
$function$;
