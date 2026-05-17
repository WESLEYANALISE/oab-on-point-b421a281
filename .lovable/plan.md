
# Landing page pública da OAB na Risca

## Objetivo

Criar uma página de entrada pública (sem login) inspirada na referência enviada, mas com a paleta atual do app (toga/gold) e voltada exclusivamente ao Exame da OAB. O botão "Iniciar jornada" leva à tela de cadastro/login. Usuários já autenticados são redirecionados direto para o app.

## Estrutura de rotas (mudança importante)

Hoje `/` é a área logada (`_app/index.tsx`). Vamos reorganizar:

- `/` → **nova landing pública** (`src/routes/index.tsx`)
- `/app` → home logada atual (renomear `_app.tsx` para casar com prefixo `/app`, ou manter `_app` como layout pathless e mover home para `/app`)
- `/login`, `/signup` → continuam como estão
- Guard: se usuário autenticado acessar `/`, redireciona para `/app`. Se não autenticado acessar `/app/*`, redireciona para `/login` (já existe lógica em `_app.tsx`)

Vou usar a opção mais segura: manter `_app` como layout pathless e adicionar `/app` como prefixo real. Os links internos (`to="/"`, `to="/biblioteca"` etc.) serão atualizados para `/app`, `/app/biblioteca`, etc. Atualizo `BottomNav`, `DesktopSidebar`, `MenuDrawer`, `HomeTopCard`, atalhos, etc.

> Alternativa mais leve: deixar a área logada em `/` e colocar a landing em `/inicio` ou `/bem-vindo`. **Preciso saber se você prefere essa alternativa** antes de mover tudo — me diga e eu adapto o plano.

## Hero (1ª dobra)

- Imagem de fundo realista gerada via `imagegen` (premium): Themis com balança ao fundo, advogado de terno olhando para cima em direção à luz, ambiente cinematográfico escuro com partículas douradas. Salva em `src/assets/oab-landing-hero.webp`.
- Overlay escuro + glow dourado para garantir contraste.
- Topo: avatar/logo "O" + nome "OAB na Risca" / "Preparação para o Exame" + botão "Suporte" (link para WhatsApp ou `mailto`).
- Headline: **"Tudo para você passar na OAB em um só lugar."** com destaques em `text-gold` nas palavras "passar" e "OAB".
- Subcopy: "Aulas, resumos, flashcards, simulados, vade mecum, peças da 2ª fase e muito mais — tudo para você dominar o Exame da Ordem."
- CTA principal: botão grande "Iniciar jornada →" com gradiente `bg-gradient-toga` + glow gold (paleta do app, **sem vermelho**). Vai para `/signup`.
- Prova social: "⭐ +10.000 estudantes já estudam com a gente".
- Embaixo do hero: a palavra **OAB** com louros dourados (SVG inline).

## Seções animadas (scroll reveal)

Animações com `framer-motion` (`whileInView`, `initial`, `animate`) com `viewport={{ once: true, amount: 0.3 }}`. Cada seção tem `fade + translate-y` escalonado.

1. **Por que escolher** — 3 cards (Conteúdo completo, Método comprovado, Acompanhamento próximo) com ícones lucide.
2. **Método** — 4 passos numerados (Diagnóstico → Plano → Estudo guiado → Simulados) em timeline vertical.
3. **O que você encontra** — grid de funcionalidades (1ª fase, 2ª fase, Biblioteca, Resumos, Flashcards, Simulados, Provas comentadas, Vade Mecum, Calendário, Cronograma) — reutiliza ícones e cards do estilo atual de `_app/index.tsx`.
4. **Contagem regressiva** — `CountdownExame` em destaque com chamada "O próximo Exame está chegando".
5. **Depoimentos** — 3 cards estáticos (placeholder, com nome + cidade + texto curto).
6. **FAQ** — Accordion shadcn com 4-5 perguntas (preço, garantia, conteúdo, suporte).
7. **CTA final** — bloco escuro com gradiente, "Comece hoje sua jornada rumo à OAB" + botão "Criar conta gratuita".
8. **Footer** — links (Sobre, Termos, Privacidade, Contato), redes sociais, copyright.

## Técnico

- **Arquivo novo:** `src/routes/index.tsx` (rota pública). Usa `head()` com title/description/og otimizados para SEO (palavras-chave: "Exame OAB", "preparação OAB", "1ª fase OAB").
- **Guard:** dentro do component, `useAuth()` — se autenticado, `useEffect` faz `navigate({ to: "/app" })`. SSR-safe (sem flash).
- **Componentes novos em `src/components/landing/`:**
  - `LandingHeader.tsx` (logo + suporte)
  - `LandingHero.tsx` (imagem + headline + CTA)
  - `LandingFeatures.tsx`, `LandingMetodo.tsx`, `LandingFAQ.tsx`, `LandingCTA.tsx`, `LandingFooter.tsx`, `LandingTestimonials.tsx`
  - `Reveal.tsx` — wrapper `motion.div` com defaults de scroll reveal.
- **Animações:** já existe `framer-motion` instalado? Verifico; se não, instalo via `bun add framer-motion`.
- **Imagem hero:** gerada com `imagegen--generate_image` modelo `premium`, 1280x1600, JPG. Prompt detalhado para realismo cinematográfico.
- **Paleta:** apenas tokens `gold`, `primary`, `bg-gradient-toga`, `text-primary-foreground`. **Nenhum vermelho.**
- **Performance:** hero com `loading="eager"` + `fetchPriority="high"`; demais imagens lazy. Shimmer enquanto carrega (mesmo padrão dos cards de fase).

## Reorganização de links da área logada (se aprovada a opção `/app`)

Arquivos a atualizar com novo prefixo `/app/...`:
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/DesktopSidebar.tsx`
- `src/components/layout/MenuDrawer.tsx`
- `src/components/home/HomeTopCard.tsx`
- `src/routes/_app.index.tsx` (atalhos)
- Demais `<Link to="...">` que apontam para rotas internas do app

Rename de arquivos de rota: prefixo `_app.` continua sendo layout pathless do TanStack. Para ter `/app` real, renomeio `_app.tsx` → `_app/route.tsx`? Não — em TanStack flat, `app.tsx` (sem underscore) já cria `/app`. Plano: renomear todos os arquivos `_app.*.tsx` para `app.*.tsx` e mover guarda de auth para um `_authenticated.tsx` pai. Isso é mecânico mas envolve muitos arquivos.

## Decisões que preciso de você

1. **Estrutura de rotas:** mover toda a área logada para `/app/*` (recomendado, URL pública limpa) **ou** colocar a landing em `/bem-vindo` deixando o app em `/` como está hoje (menos refactor)?
2. **Suporte:** o botão "Suporte" abre WhatsApp, e-mail ou um link de Discord/Telegram? Qual o contato?
3. **Depoimentos e número de alunos** ("+10.000"): posso usar placeholders ou você quer fornecer textos/números reais?
