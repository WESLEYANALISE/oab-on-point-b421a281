## Objetivo

Criar a área completa de **Simulados OAB**:

- **Admin** (você): nova seção "Admin" no menu lateral, onde escolhe uma prova OAB já catalogada e dispara a geração de um simulado via **Mistral**. A Mistral lê o PDF da prova e do gabarito, extrai as 80 questões com alternativas, resposta correta e matéria, e salva tudo no Supabase.
- **Usuário comum**: vê na lista todos os simulados já gerados, faz o simulado respondendo questão por questão, recebe feedback com nota total, acertos, erros e desempenho por matéria.

---

## 1. Banco de dados (novas tabelas)

### `user_roles` (controle de admin)
- `id`, `user_id`, `role` (enum: `admin`, `user`), `created_at`
- Função `has_role(_user_id, _role)` SECURITY DEFINER
- RLS: usuário vê o próprio papel; só admin insere/deleta
- **Seed**: insere `admin` para o seu e-mail (`wn7corporation@gmail.com`)

### `simulados`
- `id`, `prova_numero` (ref à prova OAB), `titulo` (ex: "Simulado 46º Exame"), `total_questoes`, `status` (`gerando` | `pronto` | `erro`), `erro_msg`, `gerado_por` (user_id admin), `created_at`
- RLS: leitura pública pra todos os autenticados; insert/update só admin

### `simulado_questoes`
- `id`, `simulado_id`, `numero` (1-80), `enunciado` (texto), `materia` (ex: "Direito Civil"), `alternativas` (JSONB: `{A,B,C,D}`), `resposta_correta` (`A`|`B`|`C`|`D`), `justificativa` (opcional)
- RLS: leitura pra autenticados; insert/update só admin

### `simulado_tentativas`
- `id`, `user_id`, `simulado_id`, `iniciado_em`, `concluido_em` (nullable), `respostas` (JSONB: `{ "1": "A", "2": "C", ... }`), `acertos`, `total`, `por_materia` (JSONB)
- RLS: cada usuário só vê/edita suas próprias tentativas

---

## 2. Integração Mistral

Vamos usar a **API oficial da Mistral** com dois endpoints:
1. **Mistral OCR** (`mistral-ocr-latest`) — extrai o texto/markdown completo do PDF da prova e do gabarito.
2. **Mistral Chat** (`mistral-large-latest`) — recebe o texto extraído e devolve as 80 questões em JSON estruturado (enunciado, alternativas, resposta correta, matéria) usando o gabarito como referência.

Precisa do segredo **`MISTRAL_API_KEY`** — vou pedir pra você cadastrar depois que aprovar o plano.

---

## 3. Server functions (TanStack)

Todas em `src/lib/simulados.functions.ts`:

- `listSimulados()` — lista simulados prontos (autenticado)
- `getSimulado(id)` — retorna simulado + questões (sem revelar resposta correta antes de submeter)
- `iniciarTentativa(simuladoId)` — cria/retorna tentativa em andamento
- `salvarResposta(tentativaId, numeroQuestao, alternativa)` — salva resposta parcial
- `finalizarTentativa(tentativaId)` — calcula acertos/erros, por matéria, marca como concluída
- `gerarSimulado(provaNumero)` — **só admin** — dispara o pipeline Mistral (OCR → parsing → insert). Roda em background, marca status `gerando` → `pronto`/`erro`.

Todas usam `requireSupabaseAuth`. As de admin verificam `has_role(userId, 'admin')` e retornam 403 se não for.

---

## 4. Telas

### Usuário comum

**`/simulados`** — Lista de simulados prontos (cards com número do exame, nº de questões, botão "Começar"). Filtra por status `pronto`.

**`/simulados/$id`** — Tela de prática:
- Header com cronômetro, número da questão atual (ex: "Questão 12 de 80")
- Enunciado + 4 alternativas (A/B/C/D) clicáveis
- Botões: "Anterior", "Próxima", "Finalizar"
- Auto-save da resposta a cada clique
- Sidebar/grid mostrando o status de cada questão (respondida/em branco)

**`/simulados/$id/resultado/$tentativaId`** — Resultado:
- Nota total (ex: "62 de 80 — 77,5%")
- Gráfico de barras por matéria (acertos/total)
- Lista revisável: cada questão com sua resposta, gabarito, e marcador certo/errado

### Admin

**`/admin`** — Hub do admin (cards de áreas administráveis; por enquanto só "Simulados")

**`/admin/simulados`** — Gerenciar simulados:
- Lista de provas OAB disponíveis (já no banco) com status: "Sem simulado" / "Gerando…" / "Pronto" / "Erro"
- Botão "Gerar simulado" em cada uma → chama `gerarSimulado(numero)`
- Tabela com simulados já gerados (editar/excluir)

---

## 5. Menu lateral (sidebar)

Adicionar novo grupo **"Admin"** (só aparece se `has_role(user, 'admin')` for true) com:
- `/admin` — Painel admin
- `/admin/simulados` — Gerar simulados

Mesmo bloco aparece no `MenuDrawer` (mobile).

---

## 6. Fluxo da geração (passo a passo)

1. Admin clica "Gerar simulado" na prova nº 46
2. Server function cria registro em `simulados` com status `gerando`
3. Dispara em background:
   a. Baixa o PDF da prova e do gabarito (URLs já estão em `provas_oab`)
   b. Manda os dois PDFs pra Mistral OCR → recebe markdown
   c. Manda o markdown pra Mistral Chat com prompt estruturado pedindo JSON com 80 questões
   d. Valida o JSON (Zod), insere as 80 linhas em `simulado_questoes`
   e. Atualiza `simulados.status = 'pronto'`
4. Se falhar, salva `status = 'erro'` + `erro_msg`
5. Frontend do admin faz polling a cada 3s pra atualizar status

---

## 7. Confirmações necessárias antes de implementar

1. **E-mail admin**: vou usar `wn7corporation@gmail.com` (o e-mail logado atualmente). Confirma?
2. **MISTRAL_API_KEY**: vou pedir o segredo via tool depois que você aprovar o plano. Você precisa criar a chave em https://console.mistral.ai/api-keys/
3. **Escopo de geração**: por enquanto só **1ª fase (80 questões objetivas)**. Sem 2ª fase (peças/discursivas) — fica pra depois.

---

## 8. O que NÃO entra agora (pra não inchar)

- Pagamento/plano premium pra simulados
- Ranking entre usuários
- Simulado por matéria isolada (todos são do exame inteiro)
- Geração de questões inéditas (só extração das oficiais)
- Cronômetro com bloqueio rígido (vai ter cronômetro visual, mas não impede continuar)
