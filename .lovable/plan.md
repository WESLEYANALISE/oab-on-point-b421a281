# Ajustes de responsividade mobile — Home "Área OAB"

Foco: viewport 390×844 (mobile real). Hoje os cards, fontes e paddings foram dimensionados pensando em desktop e estouram/desalinham no mobile (countdown apertado, "1ª Fase / 2ª Fase" com texto cortado, atalhos com 4 colunas grudadas, news cards largos demais, ferramentas com ícone+texto desbalanceados).

## O que muda (apenas frontend / `src/routes/_app.index.tsx` + alguns tokens)

### 1. Header pill "ÁREA OAB"
- Reduzir padding (`px-3.5 py-3`), avatar `h-10 w-10`, título `text-[15px]`.
- Botão "Buscar" vira ícone-only no mobile (`<Search/>` em círculo) e volta a ter texto a partir de `sm:`.

### 2. Countdown Hero (bloco vinho)
- Padding mobile `p-4` (era `p-5`), radius `rounded-2xl`.
- Linha topo (badge + Calendário) com `flex-wrap` e gap menor; badge `text-[9px]`.
- **Countdown**: criar variant `hero` mais enxuta no mobile — números `text-[34px]`, caixas `min-w-0 flex-1` (ocupam 1/3 cada via `grid grid-cols-3`) em vez de `min-w-[74px]` fixo que estoura.
- Data inferior: `text-[13px]` mobile, quebra em 2 linhas permitida (`leading-snug`), **sem capitalizar à força** (corrige hydration mismatch "11 de mai / 12 de mai" — vamos remover o `formatExamDate` custom e usar `toLocaleDateString` direto com `suppressHydrationWarning`, ou fixar uma string estática já que a data é constante).

### 3. Fases do Exame (1ª / 2ª)
- Manter `grid-cols-2` mas reduzir aspect para `aspect-[4/5]` no mobile (cards menos altos).
- Título dentro do card: `text-lg` no mobile, com `truncate` removido e `line-clamp-1`; subtítulo escondido em telas <360px ou `text-[9px]`.
- Botão circular `h-8 w-8`.

### 4. Atalhos OAB
- Trocar `grid-cols-4` por `grid-cols-2 sm:grid-cols-4` — 4 ícones em 390px ficam apertados. Cards maiores, mais legíveis, ícone `h-5 w-5`, label `text-[13px]`.

### 5. Notícias (carrossel)
- Cards de 260px → `w-[220px]` no mobile, imagem `h-28`, badge e data menores. Padding lateral consistente com o resto (`px-4`).
- Header da seção: botão "Ver todas" vira ícone-only no mobile.

### 6. Ferramentas de estudo
- Manter `grid-cols-2`. Reduzir `min-h` para `72px`, padding `p-3`, ícone `h-9 w-9`, título `text-[13px]`, subtítulo `text-[10px] line-clamp-1`.

### 7. SectionTitle
- Componente compartilhado: ícone `h-8 w-8`, título `text-[19px]` no mobile (era 22), eyebrow `text-[10px]`. Adicionar `truncate` no título também.

### 8. Espaçamento geral
- `space-y-10` → `space-y-7` no mobile (`md:space-y-10`).
- Padding lateral global `px-4` (mantém), remover `max-w-6xl` redundante nos filhos.

### 9. Correção do erro de hidratação (silenciosa)
Console mostra mismatch em data de notícia ("11 de mai" vs "12 de mai") — fuso horário entre server e client. Solução: formatar datas de notícia com `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })` e `suppressHydrationWarning` no `<span>` da data.

## Arquivos tocados
- `src/routes/_app.index.tsx` — refatorar classes responsivas + fix de data.
- `src/components/shared/CountdownExame.tsx` — variant `hero` usar `grid grid-cols-3` + tamanhos mobile-first.
- (Opcional) `src/styles.css` — nenhum token novo necessário.

## Fora do escopo
- Não mexer em rotas, dados, lógica de notícias, nem nas páginas "Em breve".
- Sem alterações de paleta/branding — só layout/spacing/tipografia responsiva.

## Verificação
Após aplicar: screenshot em 390×844 e 360×800, conferir que (a) countdown cabe sem cortar, (b) "1ª Fase / 2ª Fase" não trunca, (c) atalhos em 2 colunas legíveis, (d) sem erro de hidratação no console.
