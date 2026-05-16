# Tela de Overview do Simulado

Antes de iniciar a prática, o usuário verá uma tela com tudo sobre aquela prova. O botão "Começar simulado" é o último passo.

## Fluxo novo

```text
/simulados (lista)
   └─ clica em um simulado
      └─ /simulados/$id  (NOVA tela overview — tabs)
            ├─ Materiais   → PDF da prova · Gabarito · Edital (link oficial)
            ├─ Edital      → texto estruturado em sumário navegável
            ├─ Raio-X      → questões por matéria (gráfico/lista)
            ├─ Desempenho  → histórico das tentativas do usuário
            └─ [ Começar / Continuar simulado ]  →  /simulados/$id/praticar
```

A tela de questões atual (`_app.simulados.$id.tsx`) é movida para `_app.simulados.$id.praticar.tsx` — sem mudanças no fluxo de resposta.

## Conteúdo de cada aba

**Materiais**
- Cards com link/download direto para `prova_1fase_url`, `gabarito_1fase_url` e `edital_url` (já existem em `provas_oab`, joinado pelo `prova_numero`).
- Abre em nova aba; ícone de download.

**Edital (estruturado)**
- Server fn baixa o PDF do `edital_url`, extrai o texto e usa o Lovable AI Gateway pra gerar um sumário em JSON: seções, datas-chave, requisitos, taxas, cronograma, observações.
- Resultado fica em cache numa nova tabela `provas_oab_edital_resumo (prova_numero, conteudo jsonb, gerado_em)` — gera 1 vez, depois serve do cache.
- UI: sumário lateral clicável + conteúdo da seção; badge "Fonte oficial" com link pro PDF.

**Raio-X**
- Agrega `simulado_questoes` por matéria daquele simulado: total de questões, % do total, lista das matérias ordenadas.
- Barra horizontal por matéria + total geral.

**Desempenho**
- Lista todas as `simulado_tentativas` do usuário pra esse `simulado_id`:
  - Status: Em andamento · Finalizado · Abandonado (sem atividade > 7 dias e não concluído).
  - Acertos / total, % e duração.
  - Melhores e piores matérias (a partir de `por_materia`).
- Resumo no topo: média de acertos, melhor matéria, matéria a reforçar.

**Rodapé fixo**
- Se existe tentativa em andamento: **Continuar simulado**.
- Senão: **Começar simulado** (cria tentativa e navega pra `/praticar`).

## Detalhes técnicos

- **Rotas**
  - `src/routes/_app.simulados.$id.tsx` → vira a tela overview (tabs).
  - `src/routes/_app.simulados.$id.praticar.tsx` → conteúdo atual de resposta de questões (move o arquivo).
  - Atualizar `navigate({to: "/simulados/$id/resultado/..."})` segue igual.

- **Migration**
  ```sql
  create table public.provas_oab_edital_resumo (
    prova_numero int primary key references public.provas_oab(numero) on delete cascade,
    conteudo jsonb not null,
    gerado_em timestamptz not null default now()
  );
  alter table public.provas_oab_edital_resumo enable row level security;
  create policy "leitura pública do resumo de edital"
    on public.provas_oab_edital_resumo for select using (true);
  ```
  (Escrita só via service role, dentro da server fn de geração.)

- **Server functions novas em `src/lib/simulados.functions.ts`**
  - `getSimuladoOverview({id})` → `{ simulado, prova: {prova_1fase_url, gabarito_1fase_url, edital_url}, raioX: [{materia,total,pct}], tentativaEmAndamento? }`
  - `listMinhasTentativas({simuladoId})` → tentativas do user com status derivado.
  - `getEditalResumo({provaNumero})` → cache-or-generate; usa Lovable AI Gateway (`google/gemini-3-flash-preview`) com schema JSON pra estruturar.

- **Reaproveitamento**
  - `iniciarTentativa` já reaproveita tentativa em aberto → usado pelo botão "Começar/Continuar".
  - Persistência em `sessionStorage` da prática segue intacta.

## Escopo desta entrega

Foco em criar a tela overview funcional com Materiais, Raio-X, Desempenho e botão de iniciar. **Edital estruturado** entra na mesma entrega (com cache); se a extração falhar, a aba mostra fallback com link pro PDF oficial.
