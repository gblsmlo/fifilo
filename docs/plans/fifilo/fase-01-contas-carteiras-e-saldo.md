# Fase 01 — Contas, carteiras e saldo

**Marco 1** · Depende de: [Fase 00](fase-00-fundacao-do-produto.md) · Entrega:
FR-05, FR-07.

## Objetivo

A primeira capacidade de negócio. Ela estabelece dois modelos que todas as
fases seguintes herdam: **conta financeira com discriminador de tipo** e
**lançamento como unidade atômica de movimento de dinheiro**.

## Escopo

### Entra

- `financial_accounts`: corrente, poupança, carteira e investimento.
- `entries`: a perna de conta de qualquer movimento.
- Saldo por conta e saldo consolidado do workspace.
- Arquivamento de conta (nunca exclusão com histórico).
- Página de contas no Web, com criação, edição e arquivamento.

### Não entra

Cartão de crédito ([Fase 03](fase-03-cartao-de-credito.md)) — o `kind`
`credit_card` existe no enum desde já, mas a fase não implementa limite, ciclo
nem fatura. Transação com categoria é [Fase 02](fase-02-categorias-e-transacoes.md);
aqui o único movimento é o saldo de abertura.

## Modelagem — `packages/core/src/accounts`

Capacidade nova ganha subpath próprio em `exports`, conforme
[`00-architecture-map.md`](../../00-architecture-map.md).

```text
packages/core/src/accounts/
├── index.ts          superfície pública
├── schemas.ts        contratos HTTP (Decision 012)
├── account.ts        tipos e regras puras
├── balance.ts        cálculo de saldo a partir de lançamentos
├── ports.ts          AccountRepository, EntryReader
└── use-cases/        create, update, archive, list, balances
```

Regras que não são do banco:

- Um nome de conta é único por workspace, comparado sem caixa e sem espaço nas
  bordas.
- Conta arquivada não recebe lançamento novo, mas continua somando no histórico.
- Arquivar a última conta ativa é permitido; a UI avisa, o domínio não bloqueia.
- Saldo de abertura vira **um lançamento** datado, não uma coluna à parte.
  Assim existe uma única fórmula de saldo e o histórico começa explicado.

## Persistência

### `financial_accounts`

| Coluna | Tipo | Nota |
| --- | --- | --- |
| `organization_id`, `id` | `text` | PK composta (Decision 019) |
| `kind` | `text` | `checking · savings · wallet · credit_card · investment` |
| `name` | `text` | |
| `institution` | `text` | nulo para carteira |
| `currency` | `char(3)` | igual à moeda do workspace na Fase 01 |
| `color`, `icon` | `text` | |
| `archived_at` | `timestamptz` | nulo = ativa |
| `version` | `integer` | trava otimista (NFR-04) |
| `created_by` | `text` | FK para `users` |
| `created_at`, `updated_at` | `timestamptz` | |

Índice único parcial em `(organization_id, lower(name)) where archived_at is null`.

### `entries`

| Coluna | Tipo | Nota |
| --- | --- | --- |
| `organization_id`, `id` | `text` | PK composta |
| `transaction_id` | `text` | FK composta; nulo só no lançamento de abertura |
| `account_id` | `text` | FK composta para `financial_accounts` |
| `amount_minor` | `bigint` | **assinado**: negativo sai, positivo entra |
| `currency` | `char(3)` | |
| `occurred_on` | `date` | Decision 018 |
| `created_at` | `timestamptz` | |

Índice em `(organization_id, account_id, occurred_on)`.

### Por que `entries` e não um valor na transação

A alternativa era `transactions` com `account_id` e `to_account_id` para
transferência. Ela foi descartada porque toda consulta analítica ganharia um
caso especial para transferência, e a fatura do cartão precisa de linha por
perna de qualquer jeito.

Com a perna separada, três coisas ficam de graça e para sempre:

- saldo é `sum(amount_minor)` filtrado por conta — uma fórmula, sem ramo;
- transferência é um par de pernas com soma zero;
- pagar fatura de cartão é uma transferência, sem código novo.

Não é partida dobrada completa: receita e despesa têm **uma** perna, porque a
contrapartida está fora do sistema. A invariante que o domínio impõe é: em
transferência a soma das pernas é zero; nas demais, a soma tem o sinal do tipo.

### Saldo

```sql
select account_id, sum(amount_minor) as balance_minor
from entries
where organization_id = current_setting('app.workspace_id')
  and occurred_on <= $asOf
group by account_id
```

Sem view materializada nesta fase. A decisão de materializar vem com plano de
query anexado, quando houver volume — regra 7 dos achados herdados.

RLS `FORCE` nas duas tabelas, com as cinco provas negativas da Fase 00.

## API — `apps/api/src/features/accounts`

| Rota | Efeito |
| --- | --- |
| `GET /api/accounts` | lista, com `?includeArchived` |
| `POST /api/accounts` | cria; `409` em nome repetido |
| `PATCH /api/accounts/:id` | edita; `409` em conflito de `version` |
| `POST /api/accounts/:id/archive` | arquiva |
| `GET /api/accounts/balances` | saldo por conta e consolidado |

Rota fina: schema em `options`, acesso ao Drizzle pela transação de workspace,
`Result` mapeado por `domain-error-status.ts`.

## Web — `apps/web/src/features/accounts`

Forma da Decision 007, com `apps/web/src/features/auth` como modelo. Rota
`(authenticated)/accounts.tsx` só compõe.

- `AccountList` agrupa por `kind`, com saldo por grupo.
- `AccountFormFields` valida pelo schema do contrato e delega `onSubmit`; o
  container é quem chama o hook, faz rede, navegação e toast.
- Diálogo de arquivamento sobre `ConfirmDialog` de `packages/patterns`.
- Saldo negativo tem tratamento visual próprio e rótulo acessível — cor sozinha
  não comunica sinal.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 021 | o movimento de dinheiro é um lançamento com sinal; transação agrupa lançamentos |

## Riscos

- **Saldo de abertura como coluna.** Tentador e errado: cria duas fórmulas de
  saldo e um número que ninguém sabe explicar seis meses depois.
- **Nome único sem índice parcial.** Arquivar e recriar com o mesmo nome tem que
  funcionar; índice único total impede.
- **`version` esquecido no `where`.** O update tem que ser condicional numa
  única instrução, como em [operation.md](../../engineering/operation.md).
  Ler-depois-escrever passa em teste sequencial e perde escrita em produção.

## Critério de conclusão

- [x] Casos de uso com teste de sucesso, falha esperada e invariante — 32
      testes em `packages/core/src/accounts/use-cases/`, um fake repository
      compartilhado.
- [x] Cinco provas negativas de RLS em `financial_accounts` e `entries` —
      linha própria, isolamento entre organizações, `WITH CHECK`, sem
      contexto e rollback; as cinco contra PostgreSQL real, através do
      adapter que a API de fato chama.
- [x] Teste de concorrência: duas edições com a mesma `version`, uma vence,
      a outra recebe `409` — no fake (Core) e contra PostgreSQL real (API).
- [x] Contrato no OpenAPI e cliente Eden tipado no Web — `/openapi` lista as
      cinco rotas sem passo manual; `api.accounts.*` tipado compila no Web.
- [x] Story de `AccountFormFields` e de `AccountList` com estado vazio, cheio e
      erro — `AccountList` passou a ser dona dos três estados, não só a
      página, para caber literalmente no critério.
- [x] E2E: criar conta → ver saldo → arquivar → sumir da lista ativa —
      `e2e/accounts/accounts.spec.ts`, contra a API e um banco reais.

## Fatias de commit

1. `feat(core): add account contracts, rules and use cases`
2. `feat(database): persist financial accounts and entries with tenant policies`
3. `feat(api): expose account endpoints`
4. `feat(web): add the accounts journey`
5. `test(accounts): add cross-tenant and browser evidence`

## Registro de sessões

### 2026-09-06 — fase fechada

Cinco fatias, em ordem: `1e93e22` (Core), `a01f4e0` (schema e migração),
`e33598b` (API), `53dd7d1` (Web), `2ddd31b` (prova de rollback).

Decisão 014 aplicada pela primeira vez: accounts e entries são a primeira
capacidade a precisar de id gerado pela aplicação, o que é o próprio gatilho
da decisão para centralizar o gerador. `generateId`/`generateEntityId`
entraram em `primitives.ts`; os três `crypto.randomUUID()` existentes
(observability, outbox de convite) migraram para lá.

Achado fora do escopo original, corrigido na fatia Web: `listAccountsQuerySchema`
usava `z.coerce.boolean()`, e `Boolean('false')` é `true` em JavaScript — todo
pedido da lista "somente ativas" devolvia arquivadas também, silenciosamente.
O E2E que exercita create → archive → sumir da lista foi o que expôs o
defeito; a correção validada por caso de teste, para nenhum outro filtro
booleano em query repetir o mesmo erro sem aviso.

Escopo deliberadamente deixado de fora, sinalizado e não escondido: o saldo de
abertura é parte do contrato e do caso de uso, mas não do formulário Web ainda
— capturar um valor monetário exige uma entrada mascarada que edita o inteiro,
nunca o texto exibido (Decisão 017), o que é entrega própria. Contas nascem
com saldo zero nesta fase; uma transação as alimenta quando a Fase 02 chegar.

Evidência: `bun run lint:ci`, `bun run typecheck`, `bun run test` (171 casos),
`bun run storybook:test` (137 histórias), `bun run test:e2e` (10 jornadas,
seed_organization limpa da poluição de testes manuais antes da corrida final),
`bun run build`, `docker compose build` e um `docker compose up` completo com
sign-in e `<title>Fifilo</title>` servidos — todos verdes.
