# Fase 02 — Categorias e transações

**Marco 1** · Depende de: [Fase 01](fase-01-contas-carteiras-e-saldo.md) ·
Entrega: FR-08, FR-09, FR-10, FR-13.

## Objetivo

O núcleo do produto. Depois desta fase o usuário registra a vida financeira
inteira, exceto cartão de crédito. É também a fase que produz o dado que o
Marco 2 vai ler — a qualidade daqui é o teto do que qualquer agente conseguirá
dizer.

## Escopo

### Entra

- `categories` com tipo, cor, ícone e um nível de subcategoria.
- `transactions` como agrupador de lançamentos, com descrição, data e nota.
- Receita, despesa e transferência entre contas.
- Listagem com filtro por período, conta, categoria, tipo e busca textual.
- Arquivamento de categoria com reatribuição explícita.

### Não entra

Parcelamento e fatura ([Fase 03](fase-03-cartao-de-credito.md)). Recorrência,
orçamento, meta, anexo e importação de extrato — nenhum foi pedido no Marco 1
e a regra de escopo do `AGENTS.md` proíbe antecipar.

## Modelagem — `packages/core/src/categories` e `packages/core/src/transactions`

Duas capacidades, dois subpaths. Transação depende de categoria pelo barril
público, nunca por caminho interno.

### Categoria

- `kind`: `income` ou `expense`. Uma categoria não serve aos dois — misturar
  torna todo relatório ambíguo.
- `parentId` opcional, **um** nível. Hierarquia arbitrária custa consulta
  recursiva em toda agregação e ninguém pediu.
- Subcategoria herda o `kind` do pai; divergência é `validation`.
- Nome único por `(workspace, pai, kind)`, sem caixa.
- Arquivar, não apagar. Apagar exige que zero transação aponte para a
  categoria; caso contrário `conflict` com o código
  `category_has_transactions` — o defeito 3 herdado do Financy, resolvido com
  um caminho de saída em vez de um bloqueio seco.
- Reatribuir: `POST /categories/:id/reassign` move as transações para outra
  categoria do mesmo `kind` numa transação só, e então arquiva.

### Transação

```ts
type TransactionKind = 'income' | 'expense' | 'transfer'
```

Invariantes que o caso de uso impõe e o teste prova:

| Tipo | Pernas | Categoria | Soma das pernas |
| --- | --- | --- | --- |
| `income` | 1, positiva | obrigatória, `kind = income` | `+valor` |
| `expense` | 1, negativa | obrigatória, `kind = expense` | `-valor` |
| `transfer` | 2, opostas | proibida | `0` |

- Transferência entre a mesma conta é `validation`.
- Transferência entre contas de moedas diferentes é rejeitada nesta fase; o
  caso multi-moeda precisa de taxa e vira decisão própria.
- Valor é sempre positivo na entrada; o sinal é derivado do tipo. Aceitar valor
  negativo do cliente duplica a regra e produz despesa positiva silenciosa.
- Editar uma transação reescreve suas pernas dentro da mesma transação de banco.
- `occurredOn` é `date` (Decision 018). Data futura é permitida — agendamento é
  um uso legítimo — e a listagem separa realizado de futuro.

## Persistência

### `categories`

`(organization_id, id)` PK composta; `parent_id` com FK composta para a própria
tabela; `kind`, `name`, `color`, `icon`, `archived_at`, `version`.

Índice único em `(organization_id, coalesce(parent_id, ''), kind, lower(name))
where archived_at is null`.

### `transactions`

`(organization_id, id)` PK composta; `kind`, `description`, `notes`,
`occurred_on date`, `category_id` (FK composta, nulo em transferência),
`transfer_peer` derivado das pernas, `created_by`, `version`, timestamps.

`entries` da Fase 01 ganha a FK composta para `transactions`.

Índices: `(organization_id, occurred_on desc)` para a listagem;
`(organization_id, category_id, occurred_on)` para a agregação da
[Fase 05](fase-05-analytics-e-graficos.md). Índice entra com plano de query
anexado, em migração própria, como manda a
[operação](../../engineering/operation.md).

RLS `FORCE` e as cinco provas negativas nas duas tabelas.

## API — `apps/api/src/features/{categories,transactions}`

| Rota | Nota |
| --- | --- |
| `GET/POST /api/categories` | árvore de um nível na resposta |
| `PATCH /api/categories/:id` | |
| `POST /api/categories/:id/reassign` | move e arquiva numa transação |
| `GET /api/transactions` | filtros na query, validados por schema |
| `POST /api/transactions` | aceita `Idempotency-Key` |
| `PATCH /api/transactions/:id` | `409` em conflito de `version` |
| `DELETE /api/transactions/:id` | apaga transação e pernas juntas |

Filtro na query string com coerção explícita: `from`, `to` (`date`),
`accountId`, `categoryId`, `kind`, `q`, `cursor`, `limit`. Paginação por cursor
sobre `(occurred_on, id)` — `offset` degrada e o histórico só cresce.

## Web — `apps/web/src/features/transactions`

- Estado de URL na TanStack Router: os filtros são o `route-search.ts` da
  feature, com contrato Zod. Recarregar a página preserva o filtro; o link é
  compartilhável.
- Um diálogo por domínio, com abas Despesa/Receita/Transferência. A aba troca
  o schema e os campos, não o componente.
- `TransactionFormFields` é presentacional e delega `onSubmit`; o container tem
  rede, toast e navegação.
- Valor com máscara que edita inteiro em centavos — nunca `parseFloat` do texto.
- Erro de API mapeado para campo: nome de categoria repetido volta no campo
  nome, não num toast genérico.
- Lista virtualizada só se a medida pedir; a primeira entrega é paginada.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 022 | categoria tem tipo fixo e um nível de subcategoria; arquiva-se, não se apaga |
| 023 | transferência é uma transação de duas pernas com soma zero e sem categoria |

## Riscos

- **Sinal no cliente.** Se o valor chega assinado, existe caminho para uma
  despesa positiva entrar no banco. O contrato aceita apenas positivo.
- **Filtro de período em fuso errado.** Resolvido pela Decision 018, mas o Web
  ainda precisa calcular "este mês" no fuso do workspace, não no do navegador.
  Teste com o fuso do runner deslocado.
- **Edição de transferência.** Trocar a conta de destino tem que reescrever as
  duas pernas; reescrever uma só deixa saldo errado e passa despercebido.
  Teste de invariante: soma das pernas de toda transferência é zero, varrendo a
  tabela ao fim da suíte.
- **Reatribuição sem transação.** Mover mil transações e falhar na metade deixa
  a categoria pela metade. Uma instrução, uma transação.

## Critério de conclusão

- [x] Invariante de soma de pernas provada por teste para os três tipos —
      `packages/core/src/transactions/transaction.test.ts`, `deriveLegs`
      varrido para `income`, `expense` e `transfer`.
- [x] Cinco provas negativas de RLS em `categories` e `transactions` — linha
      própria, isolamento entre organizações, `WITH CHECK`, sem contexto e
      rollback; as cinco contra PostgreSQL real, através dos adapters que a
      API de fato chama, em ambas as tabelas.
- [x] Teste de reatribuição com rollback no meio —
      `categories-persistence.integration.test.ts`: uma falha forçada entre
      mover as transações e arquivar a origem não deixa nem uma coisa nem
      outra pela metade.
- [x] Paginação por cursor com teste de fronteira (mesma data, ids
      diferentes) — três transações na mesma data, `limit: 2`, a segunda
      página não repete nem pula a linha de fronteira.
- [x] Filtro na URL sobrevive a recarregar; teste do fuso deslocado passa —
      `route-search.ts` com contrato Zod; `resolveThisMonthRange` resolve o
      mês a partir de um fuso explícito, nunca o do executor, provado com
      `TZ` do processo deslocado para `Pacific/Kiritimati`.
- [x] Stories dos três formulários e do estado vazio da lista — Despesa,
      Receita e Transferência em `TransactionFormFields`/`TransferFormFields`,
      mais `TransactionList`'s `Empty`/`ErrorState`/`WithTransactions`.
- [x] E2E: criar categoria → registrar despesa → transferir entre contas →
      conferir saldo das duas contas → filtrar por período —
      `e2e/transactions/transactions.spec.ts`, contra a API e um banco reais,
      incluindo o reload que prova a sobrevivência do filtro na URL.

## Fatias de commit

1. `feat(core): add category and transaction contracts, rules and use cases`
2. `feat(database): persist categories and transactions with tenant policies`
3. `feat(api): expose category and transaction endpoints`
4. `feat(web): add the transactions journey`
5. `test(transactions): add cross-tenant, invariant and browser evidence`

## Registro de sessões

### 2026-09-06 — fase fechada

Oito commits, em ordem: `ca8886e` (fix no Core: categoria arquivada e
`currency` tipado nas pernas), `dd16ce2` (schema e migrações), `3f12c64`
(fix na API: `Idempotency-Key` travada e `isUniqueViolation` compartilhado),
`be1286c` (API: rotas de categorias e transações), `b97c859` (`MoneyInput`
em `packages/ui`), `652a02e` (Web: as duas jornadas), `ccce507` (stories) e
`3eca887` (prova de rollback da reatribuição e E2E).

Bug encontrado em produção antes de qualquer teste tocar nele: o servidor de
desenvolvimento da API, de pé desde antes desta sessão, respondia
`400 invalid_request` genérico em `POST /api/transactions` mesmo com um corpo
que o próprio schema Zod validava isoladamente. Uma hora de depuração
descartou o schema, a fábrica de rotas e a composição do `app.ts` — todos
corretos quando testados frescos. A causa era mais simples: o processo do
`bun --watch` não tinha pego alguma mudança de código ao longo da sessão.
Matar e reiniciar o processo resolveu sem qualquer alteração de código. A
lição registrada para a próxima depuração: suspeitar do processo antes da
composição quando o comportamento isolado e o comportamento em produção
divergem sem uma diferença de código que explique.

Achado fora do escopo original, corrigido no lugar: `transactions-persistence.ts`
lia `occurred_on` de volta como se fosse sempre string, mas o driver `SQL`
do Bun analisa uma coluna `date` para um `Date` do JavaScript antes de o
Drizzle aplicar seu próprio mapeamento em modo string. Sem correção, todo
`nextCursor.occurredOn` e todo `Transaction.occurredOn` lido do banco vinha
como um `Date`, não uma string `YYYY-MM-DD` — o teste de fronteira da
paginação por cursor expôs isso ao comparar o cursor esperado com
`toEqual`. `toDateOnly` normaliza a leitura no único lugar que a cruza.

Segundo achado, também fora do escopo original: nenhum `<select>` nativo do
formulário tinha a amarração `id`/`aria-labelledby` que `FieldLabel` precisa
para se associar a um controle — funciona de graça para `Input` (que atravessa
`Field.Control` da Base UI por dentro), não para um elemento nativo solto.
`account-form.tsx` já carregava o defeito desde a Fase 01, sem teste que o
exercitasse; a story de `TransferFormFields` e o E2E desta fase foram os
primeiros a chamar `findByLabelText`/`getByLabel` num desses campos e a
expor o problema. Toda ocorrência nova e a antiga foram embrulhadas em
`FieldControl` com `render`.

Escopo deliberadamente reduzido, sinalizado e não escondido: a categoria não
tem editor de cor nem de ícone no formulário Web ainda, embora o contrato os
declare — um seletor visual para qualquer um dos dois é entrega própria, não
um campo de texto. `resolveThisMonthRange` fixa o fuso do workspace numa
constante; a Fase 06 o torna uma configuração de fato (`monthStartDay`
incluso), como a Decisão 018 já previa.

Evidência: `bun run lint:ci`, `bun run typecheck`, `bun run test` (255
casos: 62 Core, 79 API — incluindo as dez provas negativas de RLS contra
PostgreSQL real —, 20 Web, mais UI/patterns/infra), `bun run storybook:test`
(152 histórias, 41 arquivos) e `bun run test:e2e` (11 jornadas, a nova
`transactions.spec.ts` entre elas) — todos verdes.
