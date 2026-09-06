# Fase 00 — Fundação do produto

**Marco 1** · Depende de: nada · Entrega: o repositório deixa de ser um starter
neutro e passa a ser o Fifilo, com as invariantes financeiras instaladas antes
da primeira tabela de domínio.

## Objetivo

Nenhuma linha de domínio financeiro é escrita antes de existirem: identidade do
produto, primitivo de dinheiro, convenção de data, prova de posse por tenant no
banco e o suporte de idempotência que a
[operação](../../engineering/operation.md) já exige. Cada item aqui é caro de
corrigir depois que houver dado.

## Escopo

### Entra

- Identidade: `@twincam/*` → `@fifilo/*`, `APP_NAME`, banco, Compose, README,
  títulos de doc. São 159 arquivos com a string antiga.
- `Money` em `packages/core/src/primitives.ts`.
- Convenção de data do fato financeiro.
- Chave e FK compostas por `(organization_id, id)`.
- Baseline de RLS: helper de policy, migração modelo e a suíte negativa em
  `packages/infra/database/src/tests/`.
- `apps/api/src/libs/idempotency.ts` — o mapa de arquitetura já reserva o lugar,
  o arquivo não existe.
- `packages/infra/database/src/schemas/` ganha o barril de schemas derivados por
  `drizzle-zod` para as tabelas financeiras que virão.

### Não entra

Qualquer tabela de negócio. A Fase 00 entrega ferramenta e prova, não domínio.
A migração modelo de RLS usa uma tabela real da Fase 01 — se a Fase 00 fechar
antes, ela fecha com a policy escrita e testada contra uma tabela de fixture
descartada no fim da suíte.

## Modelagem — `packages/core`

### `Money`

```ts
export type Money = { amountMinor: number; currency: CurrencyCode }
```

- `amountMinor` é inteiro assinado em unidade menor (centavo). Coluna `bigint`
  com `mode: 'number'`: exato até 2^53, o que em BRL é ~90 trilhões de reais.
  O contrato declara o limite com `z.int()` e um `max` explícito, para o
  estouro virar `422` e não silêncio.
- `currency` é ISO 4217 de três letras. O expoente (2 para BRL, 0 para JPY)
  mora numa tabela em Core, não é assumido.
- Nenhuma camada — Core, adaptador, rota, Web — recebe, devolve ou calcula
  dinheiro em ponto flutuante. Formatação para exibição é `Intl.NumberFormat`
  a partir do inteiro, no Web.
- Operações (`add`, `subtract`, `negate`, `allocate`) são funções puras em
  Core, com teste de arredondamento de rateio: dividir 100 centavos em 3 dá
  34/33/33, não 33.33 três vezes.

### Data do fato

`occurredOn` é uma data civil (`YYYY-MM-DD`), não um instante. Uma compra
aconteceu num dia; que horas eram não é fato do domínio. `createdAt` continua
`timestamptz` porque é fato do sistema.

Isso elimina, na raiz, o defeito 2 herdado do Financy: agregação por mês passa
a ser `date_trunc('month', occurred_on)` sem conversão de fuso, e o fuso do
workspace entra só quando o Web decide qual é "este mês".

### Erros de domínio

O vocabulário já existe em `packages/core/src/errors.ts`. As fases financeiras
usam os cinco `DomainErrorKind` existentes e adicionam apenas `code`. Nenhuma
fase inventa um sexto kind sem decisão.

## Persistência — `packages/infra/database`

### Chave composta como prova de tenant

Toda tabela de tenant nasce com:

```ts
primaryKey({ columns: [table.organizationId, table.id] })
```

e toda FK entre tabelas de tenant é composta:

```ts
foreignKey({
  columns: [table.organizationId, table.categoryId],
  foreignColumns: [categories.organizationId, categories.id],
})
```

Motivo: a validação de FK no PostgreSQL **não** passa por RLS. Uma FK simples
prova que a linha existe, não que ela é do mesmo workspace — exatamente o
defeito 1 herdado do Financy. Com a FK composta, apontar para outro workspace
é impossível no banco, não só improvável no caso de uso.

Custo aceito: `id` sozinho deixa de ser único globalmente; toda rota que recebe
um id resolve dentro do contexto do workspace, que é o que ela já fazia.

### RLS

Cada tabela de tenant, na mesma migração que a cria:

```sql
alter table <t> enable row level security;
alter table <t> force  row level security;
create policy <t>_workspace on <t>
  using      (organization_id = nullif(current_setting('app.workspace_id', true), ''))
  with check (organization_id = nullif(current_setting('app.workspace_id', true), ''));
```

`FORCE` não é opcional: sem ele o dono da tabela — que é o papel da aplicação —
ignora a policy e a suíte passa verde sem proteger nada.

O contexto já é aplicado por `applyWorkspaceContext` em
`packages/infra/database/src/workspace.ts`; a Fase 00 não reescreve isso, só
passa a exercitá-lo.

### Suíte negativa

Em `packages/infra/database/src/tests/`, o formato que toda tabela de tenant
repete (§ 3 do [test-plan](../../engineering/test-plan.md)):

1. organização A escreve e lê a própria linha;
2. organização B não enxerga a linha de A;
3. B não consegue **escrever** com `organization_id` de A (`WITH CHECK`);
4. sem contexto, a leitura devolve zero linhas;
5. erro no meio da transação faz rollback do contexto junto.

Sem os cinco, a tabela não é exposta.

### Idempotência

`idempotency_records`: `(organization_id, key)` único, `request_hash`,
`response_body jsonb`, `status`, `expires_at`. Retenção de 90 dias conforme
[security.md](../../engineering/security.md).

`apps/api/src/libs/idempotency.ts` expõe o envelope que uma rota de comando
usa; a chave é parte do contrato em `packages/core/src/contracts`, nunca um
detalhe da rota.

## API e Web

Nada de domínio. Só o efeito do rename e a checagem de que `app.handle()`
continua exercitando a composição inteira.

## Decisões a registrar

Antes de implementar, não depois:

| # | Decisão |
| ---: | --- |
| 017 | dinheiro é inteiro em unidade menor; nenhum ponto flutuante em nenhuma camada |
| 018 | o fato financeiro é uma data civil; fuso só na leitura |
| 019 | chave primária e FK compostas por `(organization_id, id)` são a prova de tenant |
| 020 | RLS com `FORCE` e as cinco provas negativas são pré-requisito de exposição |

Numeração a partir de 017 porque 016 é a última ativa em
[`decisions/README.md`](../../decisions/README.md).

## Riscos

- **Rename incompleto.** 159 arquivos, incluindo `exports` de package, aliases
  de `tsconfig`, volumes nomeados do Compose e o nome do banco. Um `exports`
  esquecido só falha em runtime, no import de outro package. Fechar com
  `bun run typecheck` na raiz **e** `docker compose build`.
- **RLS testada sem `FORCE`.** O modo de falha é a suíte verde e o dado
  exposto. O teste 3 (`WITH CHECK`) é o que pega.
- **`bigint` no fio.** `mode: 'number'` evita `BigInt` no JSON, que o
  `JSON.stringify` não serializa. Se algum ponto usar `mode: 'bigint'`, a rota
  quebra só quando o valor sai — teste de contrato com valor grande.

## Critério de conclusão

- [ ] Zero ocorrências de `twincam` fora do histórico do Git.
- [ ] `bun run lint:ci`, `bun run typecheck`, `bun run test` verdes na raiz.
- [ ] `docker compose build` e `docker compose up` sobem com o nome novo.
- [ ] `Money` com teste de rateio e de estouro de limite.
- [ ] Helper de policy + migração aplicada em banco limpo + as cinco provas
      negativas passando contra PostgreSQL real.
- [ ] `idempotency.ts` com teste de chave repetida devolvendo o resultado
      guardado, sem segundo efeito.
- [ ] Decisões 017–020 registradas e indexadas.

## Fatias de commit

1. `chore: rename the workspace scope and product identity to fifilo`
2. `feat(core): add the money primitive and civil-date convention`
3. `feat(database): add the tenant policy helper and its negative suite`
4. `feat(api): add the idempotency envelope`
5. `docs: record decisions 017-020`

## Registro de sessões

_(a preencher durante a execução)_
