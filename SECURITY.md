# Política de Segurança

## Reportar uma vulnerabilidade

Se você encontrou uma falha de segurança, **não abra issue pública**.

Envie um e-mail descrevendo o problema, passos pra reproduzir e o impacto
esperado para o canal de contato do projeto (atualize este arquivo com o
e-mail de segurança definitivo).

Compromisso de resposta:
- Confirmação em até **72 horas**.
- Plano de correção em até **7 dias**.
- Correção pública após validação, com crédito (se desejado).

## Escopo

- Aplicação web em `*.lovable.app` e domínio próprio.
- Servidor: TanStack Start sobre Cloudflare Worker.
- Banco: Supabase (RLS obrigatória em dados de usuário).

Fora de escopo: ataques de força bruta sem prova de impacto, divulgação de
versão de bibliotecas, falta de headers cosméticos sem vetor real.

## Boas práticas internas

- Secrets nunca no bundle do cliente (`VITE_*` é público).
- `SUPABASE_SERVICE_ROLE_KEY` só em `src/integrations/supabase/client.server.ts`.
- Toda função de servidor que mexe com dados do usuário usa
  `requireSupabaseAuth` + Zod no `inputValidator`.
- Endpoints `/api/public/*` nunca retornam PII e validam assinatura
  quando recebem webhooks.
