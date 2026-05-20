## Objetivo

1. Ao clicar em **Constituição Federal** na home do Vade Mecum, **não** abrir direto a lista de artigos. Mostrar antes uma tela de escolha com duas opções:
   - **Constituição Federal** (corpo principal — arts. 1º ao 250)
   - **ADCT — Ato das Disposições Constitucionais Transitórias** (arts. 1º em diante, dentro do mesmo registro `cf` no banco)
2. A tela de leitura do artigo (sheet) deve ser **fixa em tela cheia**, sem scroll por trás — só a área do texto do artigo rola. Hoje o sheet abre em `95vh` deixando o cabeçalho do app ("Voltar / Início") visível atrás, o que faz parecer que a tela "scrolla por inteiro".

## Contexto técnico (banco)

- Existe **um único registro** em `vade_mecum_leis` com `slug = 'cf'` (`id 107454fe…`, 417 artigos).
- Os artigos estão na mesma tabela `vade_mecum_artigos`, ordenados por `ordem`:
  - `ordem 1–272` → CF principal (numero "1º"…"250").
  - `ordem 273–417` → ADCT (numero reinicia em "1º").
- A divisão é detectada pelo "reset" do `numero` (cai de 250 para 1º entre `ordem 272` e `273`).

Nenhuma mudança de banco necessária — a separação é feita no client a partir do ponto onde o `numero` reinicia.

## Mudanças

### 1. Roteamento

- Nova rota `/_app/vade-mecum/cf/index.tsx` → tela de seleção (CF principal × ADCT).
- Nova rota `/_app/vade-mecum/cf/$parte.tsx` onde `$parte` é `"principal"` ou `"adct"` → renderiza `EstatutoArtigosPage` filtrando os artigos.
- Remover o fallback genérico `/_app/vade-mecum/$slug.tsx` para o slug `cf` (continua valendo para outros futuros slugs).
- Na home (`_app.vade-mecum.index.tsx`), o card "Constituição Federal" passa a apontar para `/vade-mecum/cf` (a tela de seleção).

### 2. Tela de seleção

Novo componente em `cf/index.tsx`:
- Cabeçalho com brasão + "Constituição Federal · 1988" (mesmo estilo da página de estatuto).
- Dois cards grandes:
  - **Constituição Federal** — "Corpo principal · 250 artigos"
  - **ADCT** — "Ato das Disposições Constitucionais Transitórias · 145 artigos"
- Ambos com `Link` para `/vade-mecum/cf/principal` e `/vade-mecum/cf/adct`.

### 3. Filtro CF principal × ADCT em `EstatutoArtigosPage`

- Aceitar uma prop opcional `parteCF: "principal" | "adct" | null` (ou inferir do path).
- Após carregar `data.artigos`, calcular o índice de corte: primeiro item após `ordem 1` cujo `numero === "1º"` e cujo `ordem > 1` → começo do ADCT.
- `principal` → `slice(0, corte)`; `adct` → `slice(corte)`.
- Ajustar o título do header (`meta?.nomeCompleto` vira `"Constituição Federal"` ou `"ADCT — Ato das Disposições Constitucionais Transitórias"`) e o subtítulo (mantém "1988").
- Botão "Voltar" no header da página deve voltar para `/vade-mecum/cf` (tela de seleção), não para a home.

### 4. Sheet de leitura "tela toda fixa"

No `ArtigoSheet` (`_app.vade-mecum.estatutos.$slug.tsx`, linha ~870):

- Trocar `h-[95vh] sm:h-[92vh]` por `h-[100svh] sm:h-[100svh]` e `rounded-t-3xl` por `rounded-none` no mobile.
- Garantir `inset-0` para cobrir 100% da viewport (evita o cabeçalho "Voltar / Início" aparecer atrás).
- Manter a área de conteúdo interna como única região rolável (`overflow-y-auto` já existe na linha 988).
- Resultado: cabeçalho do sheet, rodapé com Anterior/Próximo e menu inferior ficam fixos; só o texto do artigo rola por dentro.

## Arquivos afetados

```text
src/routes/_app.vade-mecum.index.tsx         → link CF aponta p/ /vade-mecum/cf
src/routes/_app.vade-mecum.cf.index.tsx      → NOVO: tela de seleção
src/routes/_app.vade-mecum.cf.$parte.tsx     → NOVO: lista filtrada (principal | adct)
src/routes/_app.vade-mecum.$slug.tsx         → ignorar slug "cf" (ou remover)
src/routes/_app.vade-mecum.estatutos.$slug.tsx → suportar prop `parteCF`; sheet em 100svh
```

Nenhuma migração SQL necessária.