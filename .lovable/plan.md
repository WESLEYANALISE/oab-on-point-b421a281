## Problema

Ao recarregar / navegar entre páginas, o cabeçalho mostra "Estudante" por uma fração de segundo antes de trocar para o nome real (Wesley). Mesma coisa pode acontecer com avatar e checagem de admin.

## Causa

Em `src/hooks/use-auth.tsx`, o `useProfile()` é um `useQuery` que só busca o perfil **depois** que o `useAuth` confirma a sessão. Enquanto isso `profile` é `undefined`, e `HomeGreeting` cai no fallback `"Estudante"`. Quando a query resolve, troca pro nome real — gerando o "flash".

O cache do React Query é em memória, então toda vez que a aba recarrega (ou o componente é remontado) ele começa do zero, mesmo que o usuário já esteja logado.

## Plano

Persistir o mínimo necessário do perfil no `localStorage` para que o primeiro render já tenha o nome/avatar corretos — sem mudar lógica de auth, RLS ou nada de backend.

### 1. `src/hooks/use-auth.tsx`
- Criar helpers `readCachedProfile(userId)` / `writeCachedProfile(userId, profile)` que leem/gravam `localStorage` na chave `oab:profile:<userId>` (apenas campos públicos: `display_name`, `avatar_url`, `onboarding_completo`, etc — nada sensível).
- No `useProfile`, usar `initialData` lendo do cache local quando existe para o `user.id` atual. Isso faz o primeiro render já ter o perfil correto.
- No `queryFn`, após carregar do Supabase, salvar no cache local.
- No `onAuthStateChange`, quando `event === "SIGNED_OUT"` ou troca de usuário, limpar a chave antiga do localStorage.

### 2. `src/components/home/HomeGreeting.tsx`
- Quando `profile` ainda for `undefined` (sem cache e sem dado), renderizar um placeholder neutro (skeleton de 1 linha) em vez de "Estudante", pra evitar flash mesmo em primeiro login.

### 3. `src/hooks/use-admin.ts` (verificar)
- Mesmo padrão se ele também exibe estado intermediário que cause flash de UI admin (ler arquivo e aplicar cache equivalente apenas se necessário).

## O que NÃO muda

- Nenhuma mudança em RLS, migrations, server functions, autenticação, ou rotas.
- Nenhuma mudança em queries do Supabase além de adicionar leitura/escrita do cache local.
- O cache local é só uma otimização de UI; a fonte de verdade continua sendo o Supabase.

## Resultado

Após o primeiro login, todas as navegações e reloads mostram o nome/avatar real instantaneamente — sem passar por "Estudante".
