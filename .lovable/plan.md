
# Welcome OAB na Risca — recriação 1:1 do Welcome.tsx

Substituir a landing atual (`src/routes/index.tsx`) por uma reprodução fiel do `Welcome.tsx` enviado, adaptada para "OAB na Risca". O usuário só vê a tela de auth depois de clicar em "Iniciar jornada" → escolher Entrar/Criar conta → modal abre por cima da welcome (sem sair da rota `/`).

## Identidade visual adaptada

- Marca: "OAB na Risca" / sublinha "Exame da Ordem" (no lugar de "Direito Prime / Estudos Jurídicos").
- Logo: `src/assets/logo-oab-na-risca.webp` (já existe).
- Hero image: vou gerar uma `welcome-hero.webp` em `public/` no mesmo espírito visual do original (deusa Themis / advogado em luz dourada, vertical, dark dramatic — combina com a paleta gold/red do projeto).
- Louros dourados: vou gerar `src/assets/louros-dourados.webp` (coroa de louros dourada em PNG transparente).
- Headline: "Tudo para você **passar na OAB** em um **só lugar**." (mantendo o destaque em vermelho como no original).
- V-shape no centro dos louros: **1ª FASE** | **2ª FASE** com **OAB** embaixo (no lugar de Faculdade/Concursos/OAB).
- Marquee: lista de universidades **trocada por faculdades de Direito brasileiras fortes em OAB** (USP, UFMG, UFRJ, UnB, PUC-SP, FGV, Mackenzie, UFPE, UFC, UFRGS, UFSC, UFPR, UERJ, PUC-Rio, Unicamp) precedido por "Aprovado por estudantes de todo o Brasil".
- Card persuasivo: "O que é o OAB na Risca?" com texto reescrito sobre a missão da plataforma.
- Features (6 cards): adaptados para OAB — 1ª Fase, 2ª Fase, Simulados, Flashcards & Mapas Mentais, Vade Mecum, Cronograma personalizado.
- Showcase / Testimonials / Mockup slideshow: vou criar versões enxutas focadas em OAB (depoimentos de aprovados, screenshots conceituais de funcionalidades da plataforma).

## Fluxo de autenticação

- Botão "Iniciar jornada" → abre `StartChoiceSheet` (bottom-sheet em mobile, dialog em desktop) com 3 opções: **Criar conta**, **Já tenho conta**, **Entrar como convidado** (essa última leva direto para `/inicio` sem login, se aplicável — caso contrário removo).
- Escolha → abre `WelcomeAuthModal` com a aba certa (`signup` ou `login`), reusando o fluxo Supabase já existente (`signInWithPassword`, `signUp` com `emailRedirectTo: window.location.origin`).
- Botão "Suporte" no header → abre `SupportSheet` com link de WhatsApp + e-mail de contato.
- Sessão ativa continua redirecionando para `/inicio` via `beforeLoad` (já implementado).

## Arquivos a criar

Componentes welcome:
- `src/components/welcome/StartChoiceSheet.tsx`
- `src/components/welcome/WelcomeAuthModal.tsx` (Tabs login/signup integrados ao Supabase)
- `src/components/welcome/SupportSheet.tsx`
- `src/components/welcome/DesktopMockupRotator.tsx` (rotaciona screenshots conceituais; lazy)
- `src/components/welcome/MockupSlideshow.tsx` (carrossel mobile)
- `src/components/welcome/AppShowcaseSection.tsx` (lazy)
- `src/components/welcome/DemoVideoModal.tsx` (placeholder; abre vídeo opcional)
- `src/components/welcome/BadgeCarousel.tsx` (insígnias: "Atualizado p/ 42º Exame", "OAB-friendly", etc.)

Componentes ui auxiliares:
- `src/components/ui/css-infinite-slider.tsx` (marquee CSS puro, sem libs).
- `src/components/ui/testimonials-columns.tsx` exporta `TestimonialsSection` (3 colunas com depoimentos animados em loop vertical).

Hooks:
- `src/hooks/use-device-type.ts` (`isDesktop` via matchMedia).
- `src/hooks/usePrefetchRoute.ts` (preserva API `onHoverStart/onHoverEnd/onTouchStart`; pode ser no-op ou usar `router.preloadRoute`).

Assets:
- `public/welcome-hero.webp` (gerado, hero portrait dramático em dourado/preto).
- `src/assets/louros-dourados.webp` (gerado, coroa de louros dourada transparente).
- Preload do hero no `index.html`.

Styles (em `src/styles.css`):
- Keyframes `shimmerSlide`, `neonPulseText`, `lineGlow`.
- Classes `shine-effect`, `headline-shine`.

Rotas:
- `src/routes/index.tsx` reescrito 1:1 conforme o `Welcome.tsx`, com imports trocados para os componentes acima e textos adaptados ao OAB na Risca. Mantém `beforeLoad` que redireciona usuários logados para `/inicio` e o `head()` com SEO atual.

## Detalhes técnicos

- Todo o JSX, ordem das seções, animações, gradientes, sombras, tamanhos `clamp(...)`, marquee, V-shape SVG, shimmer no CTA, card persuasivo lateral dourado, features grid 1/2/3 colunas, CTA final duplo ("Acessar App" + "Já sou aluno") são preservados exatamente como no upload.
- Cores: troco hex literais do original (`#d4a84b`, `#fbbf24`, `#ef4444`, `#8B0000`, `#b91c1c`) por valores equivalentes; mantenho como inline styles para fidelidade visual (não viola tokens porque é página de marketing fortemente artística — mesmo tratamento do original).
- `framer-motion` já está disponível (uso atual em `Reveal`).
- Lazy: `AppShowcaseSection`, `TestimonialsSection`, `DemoVideoModal` carregados via `lazy()` + `Suspense`, igual ao original.
- Não toco em rotas autenticadas, `__root.tsx`, sidebar, etc.

## Fora de escopo

- Não altero `/login`, `/signup`, ou qualquer página interna.
- Não mexo em vade-mecum, aulas-interativas, códigos, etc.
- Não gero vídeo demo real (placeholder no `DemoVideoModal`).
