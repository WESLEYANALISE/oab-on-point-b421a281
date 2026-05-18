## Escopo desta fase

Entregar a navegação **Vade Mecum → Estatutos → Artigos → Leitor do artigo**, com os **10 estatutos mais cobrados** já funcionais. As outras categorias (CF, Códigos, Súmulas, etc.) continuam mostradas no hub mas ficam para próximas levas de 10.

## Os 10 estatutos desta primeira leva

Selecionados por relevância em OAB/concursos (não só por nº de artigos):

1. ECA — Estatuto da Criança e do Adolescente
2. Estatuto da OAB
3. Estatuto do Idoso
4. Estatuto da Pessoa com Deficiência
5. Estatuto da Igualdade Racial
6. Estatuto do Desarmamento
7. Estatuto da Cidade
8. Estatuto da Juventude
9. Estatuto do Torcedor
10. Estatuto do Índio

(Todos já estão no Supabase com artigos importados.)

## Fluxo de navegação

```
/vade-mecum                       (hub atual — só adiciona link real em "Estatutos")
   └── /vade-mecum/estatutos      (lista em timeline dos 10 estatutos)
         └── /vade-mecum/estatutos/$slug   (lista de artigos da lei)
                └── clique no artigo abre um Drawer/Sheet
                     deslizando da ESQUERDA p/ DIREITA
                     com o artigo estruturado
```

Sem rota separada para o artigo — ele entra como overlay (Sheet do shadcn com `side="left"`) por cima da lista, mantendo o contexto da lei.

## Telas a construir

### 1. `/vade-mecum/estatutos` — lista timeline
- Mesmo padrão visual da seção "Demais categorias" já existente (timeline com bolinha + card).
- Cada item: ícone, nome curto, nome completo, contagem de artigos, chevron.
- Header com voltar para `/vade-mecum`, título "Estatutos", subtítulo "10 estatutos essenciais".
- Server function `getEstatutos()` que lê `vade_mecum_leis` filtrando os 10 slugs definidos, preservando a ordem da lista acima.

### 2. `/vade-mecum/estatutos/$slug` — lista de artigos
- Header: voltar, nome do estatuto, total de artigos, busca por número/texto.
- Lista virtualizada simples (paginada client-side por enquanto): cada linha mostra "Art. X" + primeiras ~140 chars do texto + chevron.
- Server function `getEstatutoComArtigos(slug)` retorna `{ lei, artigos[] }` ordenado por `ordem`.
- Clique → abre o Sheet do artigo (estado local com `artigoSelecionado`).

### 3. Drawer do artigo (left → right)
- Componente `ArtigoSheet` usando `Sheet` do shadcn com `side="left"` (animação nativa entra da esquerda).
- Em mobile (390px) ocupa ~100% da largura; em desktop ~560px.
- Conteúdo estruturado em seções colapsáveis/abas:
  - **Cabeçalho**: "Art. X" + nome curto da lei + botões (favoritar, copiar, fechar).
  - **Texto do artigo** (destaque tipográfico, leitura confortável).
  - **Explicações**: tabs `Técnica · Resumida · Simples` (campos `explicacao_tecnico`, `explicacao_resumido`, `explicacao_simples_maior16`). Mostra placeholder "Em breve" se vazio.
  - **Exemplo prático** (se houver).
  - **Comentário do professor** (se houver).
  - **Termos-chave** (chips a partir de `termos`).
  - Áudio (`narracao_url`) e flashcards/questões ficam ocultos nesta fase se vazios.
- Navegação entre artigos: setas ‹ Art. anterior / Art. próximo › no rodapé do Sheet.

## Mudanças no hub `/vade-mecum`

- O card/linha "Estatutos" passa a navegar de verdade para `/vade-mecum/estatutos`.
- Total exibido vira `10` (essa leva) em vez de `28` mockado.
- Resto do hub continua igual — outras categorias ficam visualmente presentes mas sem rota ainda (clique mostra toast "Em breve" para não quebrar expectativa).

## Camada de dados (server functions)

Arquivo novo `src/lib/vade-mecum.functions.ts`:

- `getEstatutos()` → retorna os 10 estatutos na ordem definida.
- `getEstatutoComArtigos(slug)` → lei + artigos (campos leves: id, numero, texto, ordem) para a lista.
- `getArtigo(artigoId)` → artigo completo com todas as explicações para o Sheet.

Todas usam o `supabase` browser client via leitura pública (RLS já permite SELECT público nas duas tabelas).

## Detalhes técnicos

- Rotas TanStack file-based:
  - `src/routes/_app.vade-mecum.estatutos.index.tsx`
  - `src/routes/_app.vade-mecum.estatutos.$slug.tsx`
- Lista priorizada via array constante `ESTATUTOS_DESTAQUE` no módulo de dados (slug + ordem manual de relevância).
- Sheet usa `@/components/ui/sheet` (shadcn) já presente no projeto; `side="left"` garante o slide esquerda→direita.
- Sem mudança de schema — tabelas `vade_mecum_leis` e `vade_mecum_artigos` já têm tudo.
- Tokens de cor existentes (`gold`, `primary`, `card`) — nada novo no `styles.css`.
- SEO: cada rota define seu próprio `head()` (title/description).

## Fora de escopo (próximas levas)

- IA gerando explicações/exemplo/comentário sob demanda (ficará para depois — agora só renderiza o que já vier do banco).
- Favoritos, anotações, histórico de leitura.
- Códigos, CF, Leis ordinárias/complementares, Súmulas.
- Busca global por texto de artigo (a busca do hub fica desabilitada por ora, ou só filtra os destaques como já faz).