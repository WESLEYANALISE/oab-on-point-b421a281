## O que está acontecendo

A tela preta com o pequeno spinner dourado vem do arquivo `src/routes/_app.tsx`. Toda vez que você abre o app (ou troca de rota dentro da área logada), ele bloqueia a tela inteira enquanto espera duas coisas terminarem:

1. **Verificar sua sessão no Supabase** (`supabase.auth.getSession()` dentro de `src/hooks/use-auth.tsx`). Enquanto essa chamada não responde, a variável `authLoading` fica em `true` e o app inteiro vira spinner.
2. **Carregar seu perfil** do banco (a query `useProfile`) só pra confirmar que o onboarding está completo.

O problema é que o `getSession()` faz uma ida ao Supabase mesmo quando a sessão já está salva no `localStorage` do navegador, e em rede mais lenta isso demora 1–4 segundos. Como o app não mostra nada nesse meio tempo, fica essa sensação de "trava no carregamento".

A rede mostra que tudo está funcionando (seu perfil carregou com `onboarding_completo: true`), o que confirma: não é bug de dados, é o app esperando demais antes de pintar a interface.

## O que eu proponho fazer

Três ajustes pequenos, todos em arquivos do front-end:

### 1. Ler a sessão do `localStorage` na hora (sem esperar rede)
Em `src/hooks/use-auth.tsx`, trocar o fluxo atual para usar o evento `onAuthStateChange` do Supabase como fonte principal. Esse evento dispara **imediatamente** com a sessão que já está salva no navegador (`INITIAL_SESSION`), o que tira o "loading" assim que a página monta — sem precisar esperar uma chamada de rede.

### 2. Mostrar a interface antes do perfil carregar
Em `src/routes/_app.tsx`, parar de prender a tela atrás da query do perfil. A regra fica:
- Sem sessão definida ainda → mostra um esqueleto leve do app (cabeçalho + área cinza) em vez do spinner solitário.
- Sessão confirmada como ausente → redireciona pro `/login`.
- Sessão confirmada com usuário → renderiza o app já. O redirecionamento pro `/onboarding` só dispara depois que a query do perfil responde, sem segurar a tela.

### 3. Cache leve do perfil entre navegações
Adicionar `staleTime` de uns 30 segundos na `useProfile` (`src/hooks/use-auth.tsx`). Hoje, toda navegação entre páginas pode disparar nova requisição do perfil, e enquanto isso o spinner global aparece de novo. Com cache curto, o app não fica "piscando" o carregamento.

## Resultado esperado

- Abertura do app passa de "tela preta + spinner por 2-4 s" para "interface já visível, dados completando em segundo plano".
- Navegação entre páginas internas deixa de mostrar spinner cheio de tela.
- Nenhuma mudança visual no app em si — só some o gargalo de loading.

## Arquivos que serão alterados

- `src/hooks/use-auth.tsx` — usar `onAuthStateChange` como fonte da sessão + `staleTime` na query do perfil.
- `src/routes/_app.tsx` — soltar o spinner global, renderizar o shell, mover redirect de onboarding pra um efeito não bloqueante.

Sem mudanças no banco, no Supabase, ou em outras telas.
