## Diagnóstico

O app passa por uma fase visível de "procurando usuário" em toda navegação. Causas, lendo o código:

1. **`src/hooks/use-auth.tsx` só sai do `loading=true` quando o `onAuthStateChange` dispara.** Não há `supabase.auth.getSession()` síncrono na montagem. Resultado: o Provider sempre renderiza com `user=null` por alguns frames, mesmo quando a sessão já está em `localStorage`.

2. **Todas as queries das páginas internas (`_app.*`) usam `enabled: !!user`.** Enquanto o passo 1 não termina, nenhuma query roda — só skeleton. Em `simulados/$slug`, `index`, `progresso`, etc., isso aparece como a tela "carregando" inteira.

3. **`HomeGreeting` mostra o pulse cinza no lugar do nome** porque `useProfile` só fica `enabled` depois que `user` existe. Mesmo com `initialData: cached`, o `cached` só é lido quando `user.id` já está disponível — ou seja, depois do passo 1.

4. **Hydration mismatch em `_app.simulados.$slug`** (runtime error atual): o branch sem dados usa `animate-fade-in` e o branch com dados não, gerando classes diferentes entre SSR e cliente. Isso força o React a descartar e re-renderizar a subtree (mais "flash" de loading).

5. **Auth logs mostram refresh token normal (~160 ms)**, não há lentidão real do Supabase. O problema é 100% no front: estamos esperando eventos assíncronos antes de pintar o que já temos em cache local.

## Plano

### 1. `src/hooks/use-auth.tsx` — hidratar sessão de forma síncrona
- Inicializar `session` lendo `supabase.auth.getSession()` **antes** de assinar `onAuthStateChange`. Setar `loading=false` assim que a primeira resposta chegar (geralmente um microtask, pois vem do `localStorage`).
- Persistir o último `user.id` autenticado em `localStorage` (chave `oab:last-uid`) para que possamos ler o perfil em cache **antes** mesmo do `getSession()` resolver.
- Manter `onAuthStateChange` apenas para reagir a SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED e invalidar caches na troca real de usuário.
- Em `useProfile`, ler o cache (`oab:profile:<uid>`) usando `oab:last-uid` quando `user` ainda não chegou, e passar como `initialData`/`placeholderData`. Assim o nome aparece no primeiro paint.

### 2. `src/routes/_app.tsx` — não bloquear UI esperando auth
- Continuar redirecionando para `/login` quando `!authLoading && !user`, mas **renderizar o `Outlet` mesmo durante `authLoading`** (já fazemos, mas garantir que filhos não fiquem presos em skeleton). 
- Em rotas que dependem de `user`, trocar `enabled: !!user` por `enabled: !authLoading && !!user` somente onde necessário, e usar `placeholderData`/`keepPreviousData` quando a query já tem dados em cache do TanStack Query.

### 3. `HomeGreeting` — mostrar nome do cache imediatamente
- Ler `oab:profile:<last-uid>` síncrono no primeiro render (via `useState` lazy initializer) e usar como fallback de `firstName`. O pulse só aparece para usuário realmente novo (sem cache).

### 4. Corrigir hydration mismatch em `_app.simulados.$slug.index.tsx`
- Mover `animate-fade-in` para um wrapper estável (ou aplicá-lo só após `mounted`) de forma que SSR e primeiro paint do cliente produzam exatamente o mesmo `className`. Elimina o aviso e o re-render da subtree inteira.

### 5. (Opcional, baixo custo) Aumentar persistência das queries críticas
- `["simulado-overview", id]` e `["simulados-list"]` ganham `placeholderData: keepPreviousData` para navegação entre simulados não mostrar skeleton quando já existe dado antigo.

## Arquivos a editar
- `src/hooks/use-auth.tsx` (principal)
- `src/components/home/HomeGreeting.tsx`
- `src/routes/_app.simulados.$slug.index.tsx` (fix hidratação)
- Eventuais ajustes pontuais em rotas que usam `enabled: !!user` se ainda persistir flicker.

## Resultado esperado
- Primeiro paint já mostra nome do usuário e conteúdo cacheado (sem pulse).
- Skeleton de páginas internas desaparece em ~0–50 ms (cache local), em vez de esperar o round-trip do Supabase.
- Sem warning de hydration mismatch no console.
