# Autenticação + Onboarding + Saudação personalizada

Tudo passa a exigir login. Cadastro coleta nome, status acadêmico e dores. Depois, a home mostra "Bom dia, [Nome]" com foto de perfil no topo.

## 1. Banco de dados (migration Supabase)

**Tabela `profiles`** (1‑para‑1 com `auth.users`):
- `id` (uuid, PK, = `auth.users.id`)
- `display_name` (text, obrigatório)
- `avatar_url` (text)
- `objetivo` (text) — sempre "OAB" por enquanto, fica preparado pra outros
- `status_academico` (enum: `cursando` | `formado` | `outro`)
- `semestre` (smallint 1‑10, só preenchido quando `cursando`)
- `dores` (text[]) — múltiplas opções da lista pré‑definida
- `dores_outro` (text) — campo livre opcional
- `onboarding_completo` (bool, default false)
- `created_at` / `updated_at` (timestamptz)

**Trigger**: ao criar usuário em `auth.users`, cria linha em `profiles` com `display_name` vindo de `raw_user_meta_data.display_name`.

**RLS**: usuário só lê e atualiza o próprio perfil (`auth.uid() = id`). Sem `INSERT` direto (o trigger cuida).

**Storage**: bucket público `avatars` com policies:
- Leitura pública (avatar aparece na home).
- Upload/update/delete apenas para arquivos dentro de `{auth.uid()}/...`.

## 2. Rotas novas (públicas)

- `/login` — e‑mail + senha + link "Criar conta" e "Esqueci a senha".
- `/signup` — e‑mail + senha + nome. Após sucesso → redireciona para `/onboarding`.
- `/reset-password` — formulário pra nova senha (link recebido por e‑mail).
- `/onboarding` — wizard de 3 passos:
  1. **Status acadêmico**: cards selecionáveis — "Estou cursando Direito" / "Já me formei" / "Outro". Se cursando, slider/dropdown de **semestre** (1º a 10º).
  2. **O que você precisa?** — chips multi‑seleção: Material de estudo, Aulas, Cronograma, Resumos, Flashcards, Simulados, Questões comentadas, Peças de 2ª fase, Acompanhamento próximo. Campo "Outro" livre.
  3. **Confirmação** + botão "Entrar no app".
  - Salva tudo em `profiles` e marca `onboarding_completo = true`.

Layout do login/signup/onboarding: imagem de fundo elegante (toga + livros, mesmo clima das capas já geradas), card flutuante com glass effect, gradiente vinho→preto, tipografia display Plus Jakarta Sans.

## 3. Proteção de rotas

- `_app.tsx` ganha `beforeLoad` que:
  - Se não houver sessão → `redirect({ to: "/login" })`.
  - Se houver sessão mas `onboarding_completo = false` → `redirect({ to: "/onboarding" })`.
- Login/signup/reset/onboarding ficam fora do `_app` (rotas top‑level), então não entram no loop.
- `__root.tsx` ganha `onAuthStateChange` que invalida o router/queryClient ao logar/deslogar.

## 4. Saudação personalizada (substitui o pill "ÁREA OAB")

Novo componente `HomeGreeting` no topo de `_app.index.tsx`:
- Avatar circular 56×56 (foto do usuário ou iniciais sobre fundo dourado), com ícone de câmera no canto pra trocar foto.
- Texto principal: **"Bom dia, Maria"** (saudação calculada por `new Date().getHours()`: 5‑11 bom dia / 12‑17 boa tarde / 18‑4 boa noite).
- Subtítulo dourado: "Foco no 46º EOU".
- Tap no avatar abre `/perfil` (página nova bem simples) onde a pessoa troca foto, edita nome, status, semestre, dores e faz logout.

Componente lê o `profile` via `useQuery` ligado ao server fn `getMyProfile`.

## 5. Upload de avatar

Server fn `uploadAvatar({ file })`:
- Recebe `File`, valida tamanho (<2MB) e tipo (image/png|jpeg|webp).
- Faz upload pra `avatars/{userId}/avatar-{timestamp}.{ext}`.
- Atualiza `profiles.avatar_url` com a public URL.
- Retorna nova URL → react‑query refaz a saudação na hora.

## 6. Logout

Botão "Sair" em `/perfil` chama `supabase.auth.signOut()` e o `onAuthStateChange` faz o resto (redireciona pra `/login`).

## Detalhes técnicos

**Cliente Supabase**:
- Browser (`@/integrations/supabase/client`) — usado para `signIn/signUp/signOut`, `onAuthStateChange`, upload de storage.
- Server fn protegido (`requireSupabaseAuth`) — `getMyProfile`, `saveOnboarding`, `updateProfile`.

**Server fns** ficam em `src/lib/profile.functions.ts` (client‑safe, fora de `src/server/`).

**Hook `useAuth`** em `src/hooks/use-auth.ts`: expõe `{ user, session, profile, isLoading }` lendo da sessão atual e do server fn `getMyProfile`. Wrap único em `__root` (provider) → consumido pela home e pelo `_app.tsx` beforeLoad.

**Imagem de fundo**: gerada com Lovable AI (mesma estética das capas das fases) — `auth-bg.jpg` em `src/assets/`, aplicada com `bg-cover` + overlay vinho 60%.

**Validação**: Zod em todos os formulários (signup, onboarding, update). Limites: nome ≤80, dores ≤9 opções da lista + opcional "outro" ≤200.

**Segurança**: roles ficam de fora dessa task (só fluxo de cadastro/perfil); RLS na `profiles` cobre o caso. Nada de service role no cliente.

## Arquivos criados / alterados

**Novos**
- `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/reset-password.tsx`, `src/routes/onboarding.tsx`, `src/routes/_app.perfil.tsx`
- `src/components/auth/AuthShell.tsx` (layout com imagem de fundo)
- `src/components/home/HomeGreeting.tsx`
- `src/components/profile/AvatarUploader.tsx`
- `src/hooks/use-auth.ts`
- `src/lib/profile.functions.ts`
- `src/lib/profile.server.ts`
- `src/data/onboarding-options.ts` (lista de dores)
- `src/assets/auth-bg.jpg` (gerada)

**Editados**
- `src/routes/__root.tsx` — `onAuthStateChange` + AuthProvider.
- `src/routes/_app.tsx` — `beforeLoad` exigindo sessão + onboarding.
- `src/routes/_app.index.tsx` — substituir pill "ÁREA OAB" por `<HomeGreeting />`.
- `src/components/layout/MobileHeader.tsx` / `DesktopSidebar.tsx` — link pra `/perfil` no avatar; botão sair no menu.

**Migration**: cria `profiles`, trigger `handle_new_user`, bucket `avatars` e RLS.

## Fora de escopo

- Login social (Google etc.) — só e‑mail + senha agora.
- Sistema de roles/admin.
- Personalização de UX baseada nas "dores" (por enquanto só armazenamos; pode virar onboarding inteligente depois).
- E‑mails customizados de confirmação (usa o template padrão do Supabase).
