## Objetivo
1. Fazer as telas abrirem instantaneamente ao clicar.
2. Adicionar uma animação de slide da esquerda para a direita em toda troca de rota.

## O que vai mudar

### 1. Pré-carregamento de rotas (`src/router.tsx`)
- Trocar `defaultPreload: false` por `defaultPreload: "intent"`.
- Resultado: assim que o usuário toca/passa o dedo sobre um botão ou link, a rota e seus dados começam a carregar antes mesmo do clique — quando ele clica, a tela já está pronta.
- Também vou habilitar `defaultPreloadDelay: 50` para começar o preload bem rápido.

### 2. Animação de transição (`src/routes/_app.tsx`)
- Envolver o `<Outlet />` num wrapper animado usando `framer-motion` (`AnimatePresence` + `motion.div`), com `key={pathname}`.
- Animação: entra deslizando da esquerda (`x: -24, opacity: 0` → `x: 0, opacity: 1`) e sai deslizando para a direita (`x: 24, opacity: 0`).
- Duração curta (~220ms, easing suave) para sentir rápido e fluido, sem atrasar a percepção de instantaneidade.
- Aplica em **todas** as rotas dentro do layout `_app` (início, biblioteca, provas, matérias, simulados, vídeoaulas, etc.) — ou seja, em tudo que o usuário navega no app.

### 3. Sem mudanças de lógica
- Não toco em autenticação, dados, server functions nem layout.
- Apenas roteador + wrapper visual.

## Detalhes técnicos
- `framer-motion` já está disponível no projeto (ou instalo via `bun add framer-motion` se faltar).
- O wrapper respeita `prefers-reduced-motion` (sem animação para quem desabilitou movimento no sistema).
- O `BottomNav`, `MobileHeader` e `DesktopSidebar` ficam fora do wrapper animado — só o conteúdo da página desliza, a navegação fica fixa.

## Resultado esperado
- Clicar em qualquer item (Biblioteca, Simulados, Provas, Videoaulas, Matérias, Progresso, etc.) abre a tela praticamente sem espera.
- Cada troca de tela tem uma transição rápida e elegante deslizando da esquerda para a direita.