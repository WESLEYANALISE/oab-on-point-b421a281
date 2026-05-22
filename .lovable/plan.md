
## Objetivo

Adicionar um botão flutuante (FAB) no canto inferior direito da página `/atualizacoes-leis`. Ao tocar, abre um painel lateral deslizando da direita para a esquerda com filtros temáticos (códigos, Constituição, estatutos) e opção de marcar leis "importantes" que a pessoa quer acompanhar.

## Comportamento

**FAB**
- Posição: `fixed bottom-24 right-4` (acima da BottomNav mobile), `bottom-6 right-6` no desktop.
- Visual: círculo dourado com ícone `SlidersHorizontal`. Mostra um pontinho indicador quando há filtro ativo.

**Painel lateral (Sheet)**
- Abre da **direita para a esquerda** (`side="right"` do componente `Sheet` do shadcn).
- Largura: full no mobile, ~380px no desktop.
- Conteúdo em duas seções:

### Seção 1 — Filtros rápidos (presets)
Chips selecionáveis que filtram a lista por tema. Apenas um ativo por vez (incluindo "Todos"):
- **Todos** (default)
- **Códigos** → leis cujo nome contém "Código" (Penal, Civil, CDC, CTN, CTB, etc.)
- **Constituição** → ECs + qualquer ato que altere a CF/88
- **Estatutos** → leis cujo nome contém "Estatuto" (ECA, Idoso, OAB, etc.)
- **Tributário** → matérias fiscais (heurística por palavras-chave na ementa)
- **Penal** → palavras-chave penais na ementa
- **Trabalhista** → CLT + palavras-chave trabalhistas

Substituem a faixa atual de filtros por tipo (Leis, EC, MP, Decretos, Vetos), que continua disponível dentro do painel como sub-seção "Por tipo de ato".

### Seção 2 — Leis importantes para acompanhar
Lista de checkboxes com leis-base relevantes para concurseiro/OAB:
- Constituição Federal (Lei nº — CF/88)
- Código Penal (DL 2.848/40)
- Código de Processo Penal (DL 3.689/41)
- Código Civil (Lei 10.406/02)
- Código de Processo Civil (Lei 13.105/15)
- CLT (DL 5.452/43)
- CDC (Lei 8.078/90)
- CTN (Lei 5.172/66)
- Estatuto da OAB (Lei 8.906/94)
- Lei Maria da Penha (Lei 11.340/06)
- ECA (Lei 8.069/90)
- Estatuto do Idoso (Lei 10.741/03)

Quando uma ou mais estão marcadas, a lista da página passa a mostrar **apenas atos que alteram/citam essas leis** (match pelo número da lei na ementa, ex.: "Altera a Lei nº 11.340"). Aparece um contador "X leis acompanhadas" no rodapé do painel + botão "Limpar".

### Rodapé do painel
- Botão "Limpar filtros" (ghost).
- Botão "Aplicar" (dourado) — fecha o sheet. As mudanças também já são aplicadas em tempo real conforme o usuário toca.

## Persistência

As "leis importantes" marcadas ficam salvas em `localStorage` (`oab:atualizacoes:leis-acompanhadas`) para a pessoa não precisar marcar de novo na próxima visita. O preset rápido é session-only.

## Lista da página

Quando há filtro ativo (preset ≠ "Todos" ou alguma lei acompanhada marcada):
- A faixa horizontal de filtros por tipo (atual) **some** — o controle agora vive no painel.
- Aparece uma linha discreta acima da lista: `Filtrando por: Códigos · 3 leis acompanhadas  [×]`.

Sem filtro: comportamento atual preservado (carrossel de dias + faixa de filtros opcional).

## Arquivos

**Editar**
- `src/routes/_app.atualizacoes-leis.index.tsx`
  - Adicionar FAB + estado do painel.
  - Mover/duplicar lógica de filtros para um novo componente `FiltrosPanel`.
  - Aplicar filtros derivados (preset + leis acompanhadas) no `atos` antes do `useMemo` que alimenta a lista.
  - Hook `useEffect` para hidratar/persistir `leis-acompanhadas` no `localStorage`.

**Criar**
- `src/lib/atualizacoes-filtros.ts` — catálogo das leis importantes (número, label, slug) + helpers `matchPreset(ato, preset)` e `matchLeisAcompanhadas(ato, slugs)`.

**Usar (já existem)**
- `src/components/ui/sheet.tsx` (shadcn) — para o painel lateral.
- `src/components/ui/checkbox.tsx` — para a lista de leis.
- Ícones `lucide-react`: `SlidersHorizontal`, `X`, `Check`.

## Notas técnicas

- O match por lei usa regex no campo `ementa` do ato: `/Lei n[ºo°]?\s*11\.?340/i`. Para a CF/88 também aceita "Constituição Federal" e tipo `emenda_constitucional`.
- Não mudamos a serverFn `listResenhaMes` — filtragem é 100% client-side sobre o array já carregado do mês.
- Sem mudanças em design tokens; usar `bg-gold`, `border-gold/40`, `text-foreground`, etc., já definidos.
