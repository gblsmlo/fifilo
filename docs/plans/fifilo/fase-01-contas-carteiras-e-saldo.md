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

- [ ] Casos de uso com teste de sucesso, falha esperada e invariante.
- [ ] Cinco provas negativas de RLS em `financial_accounts` e `entries`.
- [ ] Teste de concorrência: duas edições com a mesma `version`, uma vence,
      a outra recebe `409`.
- [ ] Contrato no OpenAPI e cliente Eden tipado no Web.
- [ ] Story de `AccountFormFields` e de `AccountList` com estado vazio, cheio e
      erro.
- [ ] E2E: criar conta → ver saldo → arquivar → sumir da lista ativa.

## Fatias de commit

1. `feat(core): add account contracts, rules and use cases`
2. `feat(database): persist financial accounts and entries with tenant policies`
3. `feat(api): expose account endpoints`
4. `feat(web): add the accounts journey`
5. `test(accounts): add cross-tenant and browser evidence`

## Registro de sessões

_(a preencher durante a execução)_
