## Objetivo

Criar uma página no painel admin onde é possível selecionar um artigo já existente no Vade Mecum, gerar a narração via Gemini TTS (voz feminina PT-BR, ex: *Kore*), salvar o áudio no Storage e ouvir ali mesmo. Por enquanto só admin — sem expor pro usuário final.

## O que será criado

### 1. Banco de dados (migration)

Bucket de Storage e tabela `vade_mecum_narracoes`:

- Bucket `narracoes` (privado — só admin lê via signed URL).
- Tabela `vade_mecum_narracoes`:
  - `artigo_id` (uuid, FK → `vade_mecum_artigos`, único)
  - `lei_id` (uuid)
  - `audio_path` (text — caminho no bucket)
  - `voz` (text, default `Kore`)
  - `texto_narrado` (text — o que foi efetivamente enviado pro TTS, pra debug)
  - `duracao_ms` (int, nullable)
  - `gerado_por` (uuid, FK auth.users)
  - `created_at`, `updated_at`
- RLS: SELECT/INSERT/UPDATE/DELETE apenas para `has_role(auth.uid(), 'admin')`.
- Políticas no `storage.objects` para o bucket `narracoes`: leitura/escrita só para admin.

### 2. Server functions (TanStack)

`src/lib/narracoes.functions.ts`:

- `listarArtigosParaNarrar({ leiId?, busca?, page })` — lista artigos com flag `tem_narracao` (join com `vade_mecum_narracoes`). Paginado.
- `listarLeis()` — leis disponíveis.
- `gerarNarracaoArtigo({ artigoId, voz? })` — protegida por `requireSupabaseAuth` + check de admin:
  1. Busca o artigo (`numero`, `texto`) e a lei (`titulo`).
  2. Monta o texto a ser narrado (regras abaixo).
  3. Chama Gemini TTS direto via `GEMINI_API_KEY` (modelo `gemini-2.5-flash-preview-tts`, `responseModalities: ["AUDIO"]`, `prebuiltVoiceConfig.voiceName = "Kore"`, languageCode `pt-BR`).
  4. Recebe PCM base64 → embrulha em header WAV (24kHz mono 16-bit).
  5. Upload no bucket `narracoes` em `${lei_id}/${artigo_id}.wav` (upsert).
  6. Upsert em `vade_mecum_narracoes`.
  7. Retorna signed URL (1h).
- `obterNarracao({ artigoId })` — retorna signed URL atualizada.
- `excluirNarracao({ artigoId })` — remove do storage e da tabela.

### 3. Regras de transformação do texto antes do TTS

Função pura `montarTextoNarracao({ leiTitulo, artigoNumero, artigoTexto })`:

1. Prefixo: `"<LeiTitulo>, artigo <numero por extenso>."`
   - Conversão por extenso: `1 → primeiro`, `2 → segundo`, …, `10 → décimo`. Acima de 10 usa ordinal composto até 999 (`11 → décimo primeiro`, `21 → vigésimo primeiro`, etc.). Se vier algo como `1-A`, fica `primeiro-A`.
2. Remover qualquer trecho entre parênteses `(...)` (inclusive aninhados simples) — não é narrado.
3. Normalizar nomenclatura inline:
   - `Art. N` → `Artigo <ordinal>`
   - `§ N` ou `§ único` → `Parágrafo <ordinal>` / `Parágrafo único`
   - `I, II, III…` no início de linha (numeração romana até L) → `Inciso <ordinal>` (`I → primeiro`, `II → segundo`…)
   - `a)`, `b)` no início de linha/segmento → `Alínea a`, `Alínea b`
4. Colapsar múltiplos espaços/quebras e adicionar pontuação leve entre blocos pra dar pausa natural.
5. Limite de segurança: trunca em ~4000 caracteres (TTS tem limite). Se exceder, retorna erro pedindo divisão.

Essa função fica isolada em `src/lib/narracoes.utils.ts` (sem deps de servidor) pra ser testável.

### 4. UI — `src/routes/_app.admin.narracoes.tsx`

Layout:

```text
┌─ Narração de Artigos ──────────────────────────────────┐
│  [Select: Lei ▾]   [Busca por nº/texto ____________]   │
├────────────────────────────────────────────────────────┤
│  Art. 1º  · "Ninguém será obrigado..."    [▶ Narrar]   │
│  Art. 2º  · "A lei não prejudicará..."    [♻ Regerar]  │  ← já tem
│  Art. 3º  · ...                            [▶ Narrar]   │
└────────────────────────────────────────────────────────┘
```

- Filtro por lei (select) e busca textual.
- Cada linha mostra: número, preview do texto, badge "narrado" se já existe.
- Ações por linha:
  - **Narrar** (se não tem) → chama `gerarNarracaoArtigo`, mostra spinner, ao terminar abre player inline.
  - **Ouvir** → `<audio controls>` com signed URL.
  - **Ver texto narrado** (dialog) → mostra o resultado de `montarTextoNarracao` antes de gerar, pra revisar.
  - **Regerar** → confirma e chama de novo (sobrescreve).
  - **Excluir** → remove storage + linha.
- Indicador de voz padrão (Kore) no topo, com possibilidade futura de trocar.
- Adicionar link "Narração" no menu/cards do `_app.admin.index.tsx`.

### 5. Detalhes técnicos relevantes

- **Gemini TTS endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=$GEMINI_API_KEY`
  - Body:
    ```json
    {
      "contents": [{ "parts": [{ "text": "<texto montado>" }] }],
      "generationConfig": {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
          "voiceConfig": {
            "prebuiltVoiceConfig": { "voiceName": "Kore" }
          },
          "languageCode": "pt-BR"
        }
      }
    }
    ```
  - Resposta vem em `candidates[0].content.parts[0].inlineData.data` (PCM 16-bit LE 24kHz mono, base64).
  - Convertemos pra WAV adicionando header de 44 bytes no servidor antes do upload.
- Chamada feita no server function (`process.env.GEMINI_API_KEY`), nunca no client.
- Sem streaming — gera o áudio inteiro e devolve URL.

### 6. Fora de escopo (não faremos agora)

- Player no Vade Mecum do usuário final.
- Trocar de voz na UI (fica fixo em Kore, mas o campo `voz` já existe).
- Narração em lote ("narrar todos da lei X").
- Geração paralela em background com fila.

## Próximos passos depois do plano aprovado

1. Migration (tabela + bucket + RLS).
2. `narracoes.utils.ts` (texto → texto narrável) + função pura testada mentalmente.
3. `narracoes.functions.ts` (server fns).
4. Rota `_app.admin.narracoes.tsx` com UI completa.
5. Link no admin index.