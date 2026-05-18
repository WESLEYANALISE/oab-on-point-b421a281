## Objetivo

Reestruturar o Vade Mecum em três telas seguindo exatamente os prints enviados, mantendo o tema dourado/escuro atual do app.

---

## Tela 1 — Lista de estatutos (`/vade-mecum/estatutos`)

Reescrever `src/routes/_app.vade-mecum.estatutos.index.tsx`:

- Cabeçalho central: brasão da República (asset em `src/assets/brasao.png` — gerar), título **"CÓDIGOS & LEIS"** em serifa dourada, subtítulo "Legislação brasileira compilada", pequeno ícone de câmera no canto.
- Barra de busca arredondada com botão **"Buscar"** dourado à direita.
- Toggle de 3 abas (pill): **Todos · Favoritos · Recentes**, cada uma com contador.
- Lista de cartões, cada um com:
  - Barra lateral colorida (cor por categoria).
  - Ícone redondo colorido (laranja/vermelho/azul/roxo etc.).
  - Sigla grande (ex.: "CC") + nome completo abaixo.
  - Tocar abre `/vade-mecum/estatutos/$slug`.
- Persistir favoritos e recentes do usuário (Supabase) — favoritos por user, recentes em `localStorage`.

---

## Tela 2 — Lista de artigos de uma lei (`/vade-mecum/estatutos/$slug`)

Reescrever `src/routes/_app.vade-mecum.estatutos.$slug.tsx`:

- Cabeçalho centralizado: brasão, nome da lei em serifa (ex.: "CÓDIGO PENAL"), subtítulo com decreto/lei, link **"Ver no Planalto"** com ícone externo, divisor dourado.
- Barra de busca + botão **Buscar**.
- Linha de 5 chips redondos coloridos (Favoritos · Playlist · Anotações · Novidades · Radar). Funcionais:
  - **Favoritos** — já existe (filtra artigos favoritos).
  - **Playlist** — placeholder "em breve".
  - **Anotações** — abre lista de anotações do usuário nessa lei.
  - **Novidades** — placeholder.
  - **Radar** — atalho para a aba Relevância.
- Toggle pill 2 abas full-width: **Artigos · Capítulos** (remove Relevância e Favoritos — viram chips).
- Cards de artigo: ícone redondo com balança, "Art. Nº" + check verde, descrição em 2 linhas, seta. Mesmo tamanho para todos.

---

## Tela 3 — Leitor de artigo (Sheet)

Reescrever o componente `ArtigoSheet` no mesmo arquivo:

- Sheet bottom (mobile) / right (desktop) ocupando ~95% da altura.
- **Header**: tag "CÓDIGO PENAL" pequena dourada, "Art. Nº" grande, à direita botão "···" (menu com copiar/compartilhar/Planalto) e botão **X** dourado redondo. (Resolve o problema dos 2 X.)
- **Barra de funções (topo)**: 5 ícones em coluna vertical com label — **Estudar · Praticar · Narração · Anotações · Perguntar**. Item central (Narração) com destaque dourado preenchido. Funcional:
  - Estudar → mostra explicações.
  - Praticar → questões relacionadas (placeholder).
  - Narração → toca `narracao_url`.
  - Anotações → editor de nota do usuário (Supabase, nova tabela `vade_mecum_anotacoes`).
  - Perguntar → abre assistente IA com contexto do artigo.
- **Toggle interno 4 abas**: **Artigo · Explicação · Exemplo · Termos** (sublinhado dourado no ativo). Conteúdo:
  - Artigo: texto + botão "Ver no Planalto".
  - Explicação: alterna técnico/resumido/simples.
  - Exemplo: campo `exemplo`.
  - Termos: glossário (`termos`).
- **Controles flutuantes na lateral direita**:
  - Botão dourado redondo "✨" (atalho IA → Perguntar).
  - Stack vertical com **+ / valor (16) / −** para escala de fonte (`useFontScale`).
- Remover o X do topo do `SheetContent` (usar `[&>button]:hidden` ou passar prop) para eliminar duplicação.

---

## Banco de dados

Nova migration:

```sql
-- Recentes (opcional via localStorage, mas favoritos já existem)
CREATE TABLE public.vade_mecum_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lei_id uuid NOT NULL,
  artigo_id uuid NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, artigo_id)
);
ALTER TABLE public.vade_mecum_anotacoes ENABLE ROW LEVEL SECURITY;
-- policies: usuário só vê/edita suas próprias anotações.
```

---

## Arquivos afetados

- `src/routes/_app.vade-mecum.estatutos.index.tsx` (rewrite)
- `src/routes/_app.vade-mecum.estatutos.$slug.tsx` (rewrite)
- `src/assets/brasao-republica.png` (gerar via imagegen, transparente)
- `src/lib/vade-mecum-anotacoes.functions.ts` (novo — CRUD anotações)
- `src/lib/vade-mecum-recentes.ts` (novo — helper localStorage)
- migration nova para `vade_mecum_anotacoes`

---

## Pontos a confirmar

1. **Categorias dos cartões da Tela 1** (cores/ícones): manter os 10 estatutos atuais (ECA, OAB, Idoso, PCD…) ou expandir para incluir CC, CP, CPC, CPP, CLT como na imagem? Hoje só temos estatutos no Supabase.
2. **Playlist/Novidades**: deixar como "em breve" por enquanto está OK?
3. **Brasão**: gerar versão dourada/oficial via imagegen ou usar um SVG simples?
