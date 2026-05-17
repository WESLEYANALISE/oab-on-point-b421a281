
# Roadmap completo — OAB na Risca de nível premium

Quatro blocos, ordenados por dependência. Cada bloco entrega valor sozinho. IA sempre via Gemini direto (`GEMINI_API_KEY`, `gemini-2.5-flash`), conforme regra do projeto.

---

## Bloco 1 — Núcleo de estudo ativo

Substitui as rotas que hoje são `ComingSoon` (`flashcards`, `oab.caderno-erros`, `plano-estudo`) por features reais.

### 1.1 Flashcards com SRS (FSRS)
- Tabelas: `flashcards` (id, user_id, frente, verso, materia, fonte_tipo `resumo|questao|manual`, fonte_id, created_at) e `flashcard_revisoes` (card_id, user_id, stability, difficulty, due_at, last_review_at, rating).
- Algoritmo FSRS-4.5 puro em TS (`src/lib/srs.ts`). Sem dep externa.
- Server fn `gerarFlashcardsDoCapitulo({ livroId, ordem })`: chama Gemini com o markdown do capítulo, pede JSON `[{frente, verso}]`, faz upsert.
- Tela `/flashcards`: fila "Revisar hoje", contador de pendentes/aprendendo/novos, botão de revisão (4 botões: again/hard/good/easy), atalhos de teclado.
- Geração automática em background ao concluir leitura de um capítulo (reaproveita `ResumoQueueDriver` como padrão).

### 1.2 Caderno de erros inteligente
- Tabela `erros_questao` (user_id, questao_id, simulado_id, alternativa_marcada, correta, materia, tentativa_em, revisado_em). Hook no fim do simulado popula isso.
- Toda questão errada gera 1 flashcard (fonte_tipo=`questao`) auto-agendado pra 1 dia.
- Tela `/oab/caderno-erros`: filtros por matéria, "revisar só erros recentes", botão "refazer essas N questões" gera mini-simulado.

### 1.3 Plano de estudo adaptativo
- Server fn `gerarPlanoEstudo({ dataExame, horasPorDia, diasSemana })`: calcula matérias fracas (taxa de acerto < média), peso histórico FGV (tabela estática `materias_peso`), distribui em blocos diários `[capítulo, questões, flashcards]`.
- Tabela `plano_estudo` (user_id, criado_em, data_exame) + `plano_estudo_blocos` (plano_id, data, ordem, tipo, ref_id, duracao_min, concluido_em).
- Tela `/plano-estudo`: calendário semanal, "hoje" em destaque, marcar concluído. Recalcula automaticamente toda segunda.

### 1.4 Revisão diária "15 min"
- Card na home: mix de 10 flashcards due + 5 questões da matéria mais fraca + 1 resumo curto. Usa o que já existe.

---

## Bloco 2 — IA conversacional jurídica (RAG)

### 2.1 Pipeline de embeddings
- Extensão `pgvector` no Supabase.
- Tabela `documentos_juridicos` (id, tipo `vade_mecum|sumula|jurisprudencia|resumo`, titulo, conteudo, materia, fonte_url, atualizado_em) e `documentos_chunks` (doc_id, chunk_index, conteudo, embedding vector(768), tokens).
- Embedding via Gemini `text-embedding-004`. Cron diário re-indexa novos resumos.
- Função RPC `match_documentos(query_embedding, materia, top_k)` com índice IVFFlat.

### 2.2 Assistente IA (rota `/assistente`)
- Chat persistente em `chat_threads` + `chat_messages` (user_id, thread_id, role, content, citations jsonb).
- Server fn `streamChatAssistente` como `async function*` que: embeda a pergunta → busca top-8 chunks → monta prompt com citações numeradas → stream SSE do Gemini.
- UI: lista de threads na sidebar, render markdown, citações clicáveis abrem o trecho do Vade Mecum.

### 2.3 "Explica essa questão"
- Botão em cada questão (corretas e erradas) abre drawer com chat já contextualizado com enunciado + alternativas + gabarito + justificativa oficial. Reusa pipeline acima.

### 2.4 Corretor de dissertativa / peça (2ª fase)
- Tabela `correcoes_peca` (user_id, area, enunciado, texto_aluno, nota_estrutura, nota_fundamentacao, nota_dispositivos, nota_total, feedback_md, criado_em).
- Server fn `corrigirPeca({ area, enunciado, texto })`: prompt estruturado com rubrica FGV oficial, retorna JSON com notas + feedback markdown + dispositivos faltantes.
- Tela `/oab/segunda-fase`: editor de texto, escolha de área, botão "Corrigir", histórico de tentativas com evolução.

### 2.5 Peça-modelo comentada (rota `/oab/peca-modelo`)
- Galeria pré-gerada de peças por área (petição inicial, contestação, recurso etc.), com comentários inline (popovers nos trechos).
- Server fn `gerarPecaComentada({ area, tipo, fatos })` gera peça nova sob demanda.

---

## Bloco 3 — Vade Mecum + Súmulas + Jurisprudência

### 3.1 Vade Mecum interativo (rota `/vade-mecum`)
- Seed inicial: scrap dos códigos do Planalto (CF, CC, CP, CPC, CPP, CLT, CDC, CTN…) → tabelas `lei` (sigla, nome, atualizado_em) e `lei_artigo` (lei_id, numero, caput, paragrafos jsonb, indice_busca tsvector).
- UI: árvore de leis na esquerda, conteúdo no centro, busca full-text (PG `tsvector` em PT-BR), marca-texto e anotações pessoais (`anotacoes_artigo`).
- Deep-link `/vade-mecum/cf/art-5` usado pelas citações do assistente.

### 3.2 Súmulas STF/STJ
- Scrap inicial + cron mensal (`/api/public/seed-sumulas` chamado por `pg_cron`).
- Tabela `sumulas` (tribunal, numero, texto, vinculante, materia, publicado_em).
- Indexadas no RAG (Bloco 2).

### 3.3 Jurisprudência em destaque
- Curadoria manual via admin: tabela `jurisprudencias` + UI em `/admin/jurisprudencia`. Aparece como widget nas páginas de matéria.

---

## Bloco 4 — Engajamento, áudio e Telegram

### 4.1 Gamificação
- Tabela `gamificacao` (user_id, xp, nivel, streak_atual, streak_max, ultimo_estudo_em).
- Eventos que dão XP: revisar flashcard, acertar questão, concluir capítulo, terminar simulado.
- Componente `StreakFlame` no header, badge de nível, "Liga semanal" (ranking dos top 50 por XP da semana — `ranking_semanal` view materializada, cron domingo 23h).
- Conquistas/badges (`conquistas` + `usuario_conquistas`): "100 questões", "matéria X dominada (>80%)", "30 dias seguidos".

### 4.2 Audioaulas via ElevenLabs (rota `/audioaulas`)
- Conector ElevenLabs (gateway). Server fn `gerarAudioCapitulo({ livroId, ordem, voz })` chama TTS, sobe MP3 no bucket `audioaulas-mp3`, salva em `audioaulas` (capitulo_id, voz, url, duracao_s).
- Geração em fila como já fazemos pros resumos.
- UI: player sticky no rodapé, velocidade 1x–2x, marca progresso por usuário (`audio_progresso`).

### 4.3 Bot do Telegram
- Conector Telegram. Tabela `telegram_links` (user_id, chat_id, criado_em). Onboarding mostra QR/link com token.
- Cron diário 8h: envia "questão do dia" + lembrete do plano + flashcards pendentes pra cada usuário linkado.
- Webhook `/api/public/telegram-webhook` (validação por secret) recebe respostas e marca acerto/erro.

### 4.4 E-mail de progresso semanal
- Resend (já alinhado com stack). Cron domingo 19h envia relatório: % preparo, matérias críticas, top 3 conquistas, próximos passos. Template scaffold em `src/lib/emails/relatorio-semanal.tsx`.

---

## Ordem de execução sugerida

1. Bloco 1.1 + 1.2 (flashcards + caderno de erros) — base que tudo depois reaproveita
2. Bloco 3.1 + 3.2 (Vade Mecum + súmulas) — alimenta o RAG
3. Bloco 2.1 + 2.2 (RAG + assistente) — diferencial
4. Bloco 2.3 + 2.4 (explica questão + corretor) — usa o RAG
5. Bloco 1.3 + 1.4 (plano + revisão 15min)
6. Bloco 4.1 (gamificação) — fácil, alto retorno
7. Bloco 4.2 (audioaulas) — feature "wow"
8. Bloco 4.3 + 4.4 (Telegram + e-mail semanal)
9. Bloco 2.5 (peça-modelo) — fecha 2ª fase

Cada item acima vira 1–3 tasks reais no momento da implementação.

---

## Detalhes técnicos consolidados

- **IA**: 100% Gemini direto. Texto/JSON em `gemini-2.5-flash`. Correções pesadas em `gemini-2.5-pro`. Embeddings em `text-embedding-004`. Sem Lovable AI Gateway.
- **Servidor**: tudo em `createServerFn` + `requireSupabaseAuth`. Filas seguem o padrão `ResumoQueueDriver` (localStorage + cliente dirige etapas).
- **DB**: Supabase com RLS por `user_id` em todas as tabelas novas. `pgvector` pro RAG. `pg_cron` + `pg_net` chamando `/api/public/*` pros jobs agendados.
- **Conectores novos**: ElevenLabs (TTS), Telegram (bot), Resend (e-mail). Todos via connector gateway.
- **Sem monetização agora** — conforme você pediu, nada de Stripe nesta fase.
- **Bibliotecas frontend novas**: `react-markdown` + `remark-gfm` (já útil pro chat e correções), nada além.

Se aprovar, sigo pelo Bloco 1.1 (flashcards) como primeira leva implementável.
