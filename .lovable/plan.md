## Problema

Quando o usuário (já logado) acessa a rota raiz `/`, a landing page antiga (hero "OAB na Risca / Iniciar jornada") aparece por alguns instantes antes do redirecionamento para `/inicio`. Isso acontece porque o redirect está dentro de um `useEffect` no componente — ou seja, a landing **renderiza primeiro** e só depois o efeito dispara o `navigate`. Resultado: flash da página antiga.

## Solução

Mover a checagem de sessão para **antes da renderização** da rota `/`, usando `beforeLoad` do TanStack Router + `supabase.auth.getSession()`. Se houver sessão, `throw redirect({ to: "/inicio" })` — o componente da landing nunca chega a montar.

### Alteração única em `src/routes/index.tsx`

1. Adicionar `beforeLoad` no `createFileRoute("/")`:
   - Chamar `supabase.auth.getSession()` (client `@/integrations/supabase/client`).
   - Se `session?.user` existir, `throw redirect({ to: "/inicio" })`.
2. Remover o `useEffect` + `useNavigate` + `useAuth` do `LandingPage` (não são mais necessários — quem está logado nunca renderiza esse componente).

### Por que não mexer em mais nada

- A landing continua acessível normalmente para visitantes não-logados.
- SEO/head meta da rota `/` permanece intacto.
- Nenhuma outra rota é afetada.

### Detalhe técnico

`beforeLoad` roda no client ao navegar e durante prerender no SSR. No SSR não há sessão Supabase (cookies do usuário não estão presentes nesse fluxo), então o `getSession()` retorna `null` e a landing é servida normalmente — exatamente o comportamento desejado para visitantes. No client, ao acessar `/` já logado, o redirect dispara antes de qualquer render.