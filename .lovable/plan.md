## Objetivo

Transformar a página `/admin/simulados` num fluxo claro de **2 etapas visíveis** (Extração → Geração), com layout que não estoura no mobile e uma **barra fixa de fila no topo** no lugar do card flutuante.

A fila continua em modo automático: assim que a Etapa 1 termina, a Etapa 2 começa sozinha. Quando uma prova termina, a próxima da fila começa.

## Mudanças

### 1. Barra fixa de fila no topo (substitui o card flutuante)

Novo componente `SimuladoQueueTopBar` que aparece dentro da página de admin (sticky `top-0`) sempre que houver `atual` ou `fila`:

```
┌──────────────────────────────────────────────────────────────┐
│ ● Gerando prova 45 · Etapa 2/2 · 47/80 questões · 58%        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ Fila: 3 aguardando (44, 43, 42)        [Ver detalhes] [✕]    │
└──────────────────────────────────────────────────────────────┘
```

- Mostra etapa atual, contagem de questões, %, ETA
- Botão "Ver detalhes" abre o `SimuladoProgressModal` existente
- Botão ✕ cancela a fila inteira (com confirm)
- Remover o `SimuladoQueueIndicator` flutuante da rota `/admin/simulados` (mantém em outras rotas se quiser, ou troca por uma pílula menor)

### 2. Card de prova reformatado (vertical, sem overflow)

Hoje os botões `Auditar / Reextrair falhas / Regerar` empilham na horizontal e estouram o card. Reescrever cada item da lista como um card vertical:

```
┌────────────────────────────────────────────────┐
│ ☐  45º EXAME DE ORDEM UNIFICADO                │
│    ● Pronto · 80 questões · 0 falhas           │
│                                                │
│    ┌──── Etapa 1: Extração ────────────┐       │
│    │ ✓ 80 questões extraídas do PDF    │       │
│    └──────────────────────────────────┘        │
│    ┌──── Etapa 2: Geração ─────────────┐       │
│    │ ✓ Simulado pronto                 │       │
│    └──────────────────────────────────┘        │
│                                                │
│    [Auditar] [Reextrair falhas] [Regerar] [🗑] │
└────────────────────────────────────────────────┘
```

- Cabeçalho: checkbox + título + status
- Bloco "Etapas" (só aparece quando a prova é o `atual`, ou foi gerada): mostra Etapa 1 e Etapa 2 como dois sub-cards com tick/spinner/erro
- Linha inferior de ações com `flex-wrap`, ícone-only no mobile, label completa no desktop
- `min-w-0` + `truncate` no título para não estourar

### 3. Mapa de etapas explícito (Etapa 1 / Etapa 2)

Hoje o backend tem 4 sub-etapas (`ocr`, `analisando`, `gerando`, `validando`). Agrupar visualmente:

- **Etapa 1 — Extração** = `ocr` + `analisando`
  - Sub-status: "Lendo PDF da prova e gabarito (OCR)" → "Detectando total de questões"
  - Resultado: "X questões detectadas · gabarito oficial carregado"
- **Etapa 2 — Geração** = `gerando` + `validando`
  - Sub-status: "Extraindo questão N/X" → "Revalidando faltantes"
  - Resultado: "X questões geradas · Y falhas reextraídas"

Isso é puramente apresentação — nenhuma mudança no pipeline backend. Helper:

```ts
function mapEtapa(etapa: string): { numero: 1 | 2; label: string; sub: string } {
  if (etapa === "ocr") return { numero: 1, label: "Extração", sub: "Lendo PDFs..." };
  if (etapa === "analisando") return { numero: 1, label: "Extração", sub: "Contando questões..." };
  if (etapa === "gerando") return { numero: 2, label: "Geração", sub: "Extraindo questões..." };
  if (etapa === "validando") return { numero: 2, label: "Geração", sub: "Revalidando..." };
  // pronto / erro
}
```

### 4. SimuladoProgressModal — visualização das 2 etapas

Reorganizar o modal para mostrar as 2 etapas como um stepper vertical:

```
Prova 45

[●] Etapa 1 — Extração                         ✓ Concluída
    └─ 80 questões detectadas no gabarito

[●] Etapa 2 — Geração                          ▶ Em andamento
    └─ Extraindo questões com Gemini
       ━━━━━━━━━━━━━░░░░░░░░░░  47/80 (58%)
       ~32s restantes

▼ Logs detalhados (collapse)
```

- Mantém os logs detalhados num accordion fechado por padrão (menos ruído)
- Cada etapa tem estado: pendente / em andamento (spinner) / concluída (✓) / erro (⚠)

### 5. Confirmar comportamento automático em fila

Sem mudanças no `SimuladoQueueDriver` — ele já avança automaticamente de uma sub-etapa para outra e da prova atual para a próxima. Só revisar para garantir que:
- Em caso de erro numa prova, a fila **continua** com a próxima (já é o comportamento atual via `finishAtual("erro")`).
- Mostrar toast claro: "Prova 45 falhou. Pulando para prova 44…".

### 6. Limpeza visual

- Espaçamento maior entre os cards (`gap-3` em vez de `divide-y`)
- Fundo do card com borda mais suave
- Badge "Pronto/Gerando/Erro" com largura mínima para não ficar cortado
- Action bar fixa no fundo do card, separada por borda tracejada

## Arquivos a alterar

- `src/routes/_app.admin.simulados.tsx` — reescrever a lista como cards verticais e montar a top-bar
- `src/components/admin/SimuladoQueueTopBar.tsx` — **novo** componente sticky no topo
- `src/components/admin/SimuladoProgressModal.tsx` — refatorar para stepper de 2 etapas + accordion de logs
- `src/components/admin/SimuladoQueueIndicator.tsx` — opcional: esconder na rota `/admin/simulados` (já existe top-bar lá), manter nas outras

## Fora de escopo

- Mudanças no pipeline backend (`simulados-admin.functions.ts`) — o fluxo OCR→análise→geração→validação fica idêntico.
- Mudança no schema do `simulado_jobs`.
- Lógica de fila (continua automática, já funciona).
