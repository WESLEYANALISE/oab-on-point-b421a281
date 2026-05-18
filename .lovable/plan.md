## Diagnóstico

O problema **não é no front**, é nos dados da tabela `vade_mecum_artigos` para o `lei_id` do `estatuto-oab`. Conferi no Supabase:

| ordem | numero | texto (início) | tamanho |
|---|---|---|---|
| 4 | — | `TÍTULO I` | 8 |
| 5 | `1º` | `Da Advocacia CAPÍTULO I Da Atividade de Advocacia Art. 1º São atividades privativas de advocacia:` | **97** |
| 6 | `2º` | `Art. 2º-A. O advogado pode contribuir com o processo legislativo…` | 179 |
| 7 | `3º` | `Art. 3º-A. Os serviços profissionais de advogado são…` | 676 |
| 8 | `4º` | `Art. 4º São nulos os atos privativos de advogado…` | 339 |

Três bugs distintos no import:

1. **Art. 1º** — só o caput, sem os incisos I/II/III. Além disso, o subtítulo do TÍTULO I ("Da Advocacia") e o cabeçalho "CAPÍTULO I Da Atividade de Advocacia" foram colados no INÍCIO do texto do artigo (por isso aparece "Capítulo junto com o artigo").
2. **Art. 2º sumiu** — a linha com `numero='2º'` contém somente o `Art. 2º-A` (incluído em 2022). O caput original ("Art. 2º. O advogado é indispensável à administração da justiça…") e os §§ 1º-3º não estão em lugar nenhum.
3. **Art. 3º idem** — sobrou só o `Art. 3º-A`, o caput original ("O exercício da atividade de advocacia… depende de inscrição na OAB") foi descartado.

Padrão: o parser agrupou por "número raiz" e ficou com a ÚLTIMA ocorrência (`2º-A`, `3º-A`) em vez de criar UMA linha para cada variante. E não separou os cabeçalhos estruturais (Título/Capítulo/Seção) das linhas de artigo.

## Correção

Reimportar somente o Estatuto da OAB direto do Planalto, com parser correto, e substituir as linhas atuais.

### Plano de execução

1. **Backup leve**: `SELECT count(*)` dos `vade_mecum_favoritos` e `vade_mecum_anotacoes` apontando para o `lei_id` do `estatuto-oab`, para reportar o impacto antes de apagar.
2. **Script de import** em `/tmp` (Node, via `code--exec`):
   - Baixa `https://www.planalto.gov.br/ccivil_03/leis/l8906.htm`.
   - Faz parse do HTML linha a linha. Para cada bloco:
     - Linhas que casam `^(TÍTULO|CAPÍTULO|SEÇÃO|Subseção)\b` viram rows com `numero=null` (cabeçalho estrutural).
     - Linhas que casam `^Art\.\s*(\d+[º°]?(?:-[A-Z])?)\b` iniciam um novo artigo. `numero` recebe `"1º"`, `"2º"`, `"2º-A"`, `"3º"`, `"3º-A"`, etc. (variantes -A/-B viram artigos próprios, separados).
     - Conteúdo do artigo acumula caput + todos os incisos romanos (I, II, III…), alíneas (a, b, c) e parágrafos (`§ 1º`, `Parágrafo único`) até o próximo `Art.` ou cabeçalho estrutural.
   - Resolve `lei_id` via `SELECT id FROM vade_mecum_leis WHERE slug='estatuto-oab'`.
   - Em transação: `DELETE FROM vade_mecum_artigos WHERE lei_id = <oab>` e `INSERT` da nova lista com `ordem` sequencial.
   - Atualiza `vade_mecum_leis.total_artigos` para a nova contagem.
3. **Validação automática** após o import:
   - Conferir que existe linha com `numero='2º'` cujo texto começa com `Art. 2º` (e NÃO `Art. 2º-A`).
   - Conferir que `Art. 1º` tem ≥ 3 incisos romanos no texto.
   - Conferir que nenhum texto de artigo contém as substrings `TÍTULO ` ou `CAPÍTULO ` no início.
4. **Limpeza colateral**: campos derivados por IA (`explicacao_*`, `exemplo`, `termos`, `narracao_url`) ficam como `null` para os artigos novos; o app já lida com isso (gera sob demanda). Favoritos/anotações antigos do estatuto-oab perdem o `artigo_id` de referência (os IDs mudam) — vou reportar a contagem antes de apagar e pedir confirmação se for >0.

### O que NÃO muda

- Front-end (`_app.vade-mecum.estatutos.$slug.tsx`) permanece igual — já sabe renderizar a hierarquia Título → Capítulo → Artigo a partir das rows com `numero=null`.
- Demais 9 estatutos (ECA, Idoso, PCD, etc.) ficam intocados nesta rodada. Se quiser, depois rodo o mesmo script de validação neles para detectar bugs análogos.

### Detalhes técnicos

- Tabela: `public.vade_mecum_artigos` (colunas `lei_id`, `numero`, `ordem`, `texto`, demais nullable).
- Migração só de dados (DELETE + INSERT por `lei_id`); não muda schema.
- Script roda fora do app, usando `process.env.SUPABASE_SERVICE_ROLE_KEY` via `supabase-js` admin client, em `/tmp/reimport-oab.ts`. Não fica versionado.
- Fonte oficial: Planalto (lei consolidada com todas as alterações até 2024).

### Pergunta antes de executar

Confirmo se posso apagar as linhas atuais de `vade_mecum_artigos` do estatuto-oab (e quaisquer favoritos/anotações que apontem para esses IDs antigos) para reimportar do zero. Se preferir preservar favoritos/anotações, dá pra tentar um match por `numero` após o import — mas dado que os textos antigos estão corrompidos, recomendo recriar do zero.
