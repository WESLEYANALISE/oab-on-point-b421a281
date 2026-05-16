## Diagnóstico

**1. Contagem regressiva sumindo (mostrando "--")**
`src/components/shared/CountdownExame.tsx` inicializa o estado como `null` e só calcula os números dentro de `useEffect`. Durante o SSR e a primeira pintura no cliente o componente renderiza `--`. Como o texto é branco (`text-primary-foreground`) sobre o fundo bordô e em fonte enorme (`text-5xl/6xl`), os traços aparecem como “barras brancas” — exatamente o que aparece no print. Se a hidratação demora ou um listener sai do ar, o componente fica preso no placeholder.

**2. Fonte "estranha" dos títulos**
Os títulos de seção ("Ferramentas de estudo", "Explorar Biblioteca", "Teste seus conhecimentos") e os labels de card ("Resumos", "Biblioteca", "Hórus") usam `font-display: Instrument Serif` — uma serifa fina e condensada que destoa do resto da UI escura + dourada e dá um ar “artigo de revista” em vez de “produto jurídico sério”.

**3. Home com hierarquia pouco premium**
Hero apertado, eyebrow do contador pequeno demais, contador sem caixas/separadores, cards de “Ferramentas de estudo” chapados, "Aulas Interativas" e "Plano de Estudo" sem peso visual de destaque. Falta refinamento e respiração.

---

## Plano

### 1. Corrigir o contador (`CountdownExame.tsx`)
- Inicializar `useState` com `diff()` direto (lazy initializer) em vez de `null`, para o número aparecer já na primeira pintura.
- Manter `suppressHydrationWarning` (o valor varia entre server e client por causa do `Date.now()`).
- Acrescentar fallback visual: cada dígito em uma “lapidação” (caixa arredondada com leve borda dourada) para parar de parecer “barras brancas” mesmo se algum dia o número não carregar.
- Atualizar a cada 30s (granularidade de minuto).

### 2. Substituir a tipografia de display
- Trocar `--font-display` de **Instrument Serif** para **Fraunces** (serifa moderna, geométrica, com peso 600/700 para títulos) — transmite seriedade jurídica + elegância editorial sem parecer datada.
- Manter `Inter Tight` para corpo.
- Ajustar `letter-spacing` e `font-weight` dos títulos para um look mais editorial-premium (`tracking-tight`, `font-semibold`).
- Carregar a fonte via `@font-face` no `src/styles.css` (Google Fonts), com `font-display: swap`.

### 3. Refinar o hero (`HomeHero.tsx`)
- Aumentar respiração interna (padding maior em mobile).
- Eyebrow "42º Exame · 1ª fase" com mais contraste do dourado e leve glow.
- Contador em caixas: cada bloco (DIAS / HRS / MIN) num cartão translúcido (`bg-primary-foreground/8` + `border-primary-foreground/15` + `backdrop-blur`) para virar um elemento icônico do app.
- Data do exame numa linha com selo dourado discreto.
- Botão "Calendário" maior e com hover/press states melhores.

### 4. Refinar a home (`_app.index.tsx`)
- Aumentar espaçamento vertical entre seções no mobile (`space-y-12`).
- Padronizar todos os cards principais com cantos `rounded-3xl`, borda mais sutil, sombra interna fraca, e leve gradiente diagonal para dar profundidade.
- Cards "Aulas Interativas" / "Plano de Estudo": adicionar ícone maior, melhorar barra de progresso (altura 2px, brilho dourado no preenchimento).
- Cards "Ferramentas de estudo" (Resumos, Biblioteca, Audioaulas, Hórus): ícone num pill maior, label em Fraunces 600, descrição em Inter 12px com mais contraste; CTA dourado com seta animada no hover.
- Carrossel "Ferramentas": gradientes mais ricos por categoria, micro-tag "NOVO/PRO" quando fizer sentido (decisão futura).
- "Pratique": linhas mais respiradas, ícones com fundo gradient + sombra colorida fraca.

### 5. Atualizar `SectionHeader`
- Eyebrow em dourado (`text-gold/80`) em vez de muted, para criar ritmo visual nas seções.
- Título com Fraunces 600, `text-2xl`/`md:text-[28px]`, `tracking-tight`.

---

## Arquivos afetados
- `src/components/shared/CountdownExame.tsx` — fix do bug + caixas estilizadas
- `src/components/home/HomeHero.tsx` — refinamento visual
- `src/components/shared/SectionHeader.tsx` — eyebrow dourado, ajuste tipográfico
- `src/routes/_app.index.tsx` — espaçamento, cantos, refinos dos cards
- `src/styles.css` — substituir `--font-display` por Fraunces + `@font-face`

---

## Pontos técnicos
- O bug do contador é resolvido fazendo `useState(() => diff())` (lazy init) — `diff()` é puro e funciona tanto no server quanto no client. O `suppressHydrationWarning` já existente cobre a diferença esperada entre os dois momentos.
- Fraunces tem variações de "softness" e "opsz"; vamos usar o arquivo estático weight 600 para evitar peso desnecessário no bundle.
- Nenhuma alteração de dados/Supabase. Mudanças 100% de frontend/apresentação.
