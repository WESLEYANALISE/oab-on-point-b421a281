## Objetivo

Fazer a página `/atualizacoes-leis` carregar sem o erro `Module "crypto" has been externalized for browser compatibility`.

## Causa raiz

`src/lib/resenha-parser.ts` importa `createHash` do módulo `crypto` do Node no topo do arquivo. Esse parser é importado indiretamente pelo bundle do cliente (rota → `useServerFn(...)` → `resenha-sync.functions.ts` → `resenha-parser.ts`), e o Vite não consegue resolver `crypto` no browser.

O hash é usado apenas para gerar a coluna `hash` de deduplicação dos atos (`tipo|numero|data`). Não precisa ser criptográfico — só determinístico.

## Correção

Trocar `createHash("sha1")` por um hash determinístico em JS puro (sem dependência de Node), mantendo a mesma assinatura e o mesmo formato hex, para não invalidar registros já gravados de hoje (se houver) e não exigir migration.

### Mudanças

1. **`src/lib/resenha-parser.ts`**
   - Remover `import { createHash } from "crypto"`.
   - Substituir a função que gera o hash por uma implementação SHA-1 em JS puro (~40 linhas, sem dependência), ou — se aceitarmos rehashear — usar FNV-1a 64-bit em hex.
   - Recomendado: **SHA-1 puro em JS** para preservar exatamente os hashes já salvos no Supabase pela execução manual anterior (se houve). Assim não precisamos limpar `legis_atos`.

2. **Nada mais muda.** O parser continua isomórfico (pode rodar tanto no server quanto, teoricamente, no client — embora só seja chamado no server). `resenha-sync.functions.ts`, hook `/api/public/hooks.resenha-sync`, cron e UI permanecem iguais.

## Verificação

- Recarregar `/atualizacoes-leis` — não deve mais lançar o erro de `crypto`.
- Conferir nos console logs do preview que a página renderiza o calendário.
- (Opcional) Rodar um sync manual e confirmar que `hash` continua sendo gerado e a deduplicação funciona.

## Pergunta

Confirma manter os hashes existentes (SHA-1 puro em JS) ou prefere que eu use um hash mais simples (FNV) e limpe a tabela `legis_atos`? Como a tabela provavelmente está vazia ou só com a extração manual de hoje, qualquer opção serve — SHA-1 JS é o caminho mais seguro.
