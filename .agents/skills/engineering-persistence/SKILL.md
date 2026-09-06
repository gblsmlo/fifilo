---
name: engineering-persistence
description: Implementar e revisar persistência neste starter — a API Drizzle de menor poder, a transação de workspace, a composição de adapters por responsabilidade coesa, a fronteira row × domínio e a cobertura negativa de isolamento com duas organizações, `WITH CHECK`, ausência de contexto e rollback — citando as Decisões 004, 003 e 002. Use quando a pergunta for "builder, fragmento `sql` ou SQL completo", "esta operação entra em qual arquivo do adapter", "isto precisa de transação de workspace", "que teste prova o isolamento" ou "posso devolver esta row". Não use para desenhar o port e o caso de uso, que é engineering-contract, para a rota HTTP, que é engineering-api, nem para a tela, que é engineering-web.
fonte: "docs/engineering/drizzle-first-persistence.md"
---

# engineering-persistence

> **Fonte desta skill:** a baseline operacional
> [`drizzle-first-persistence.md`](../../../docs/engineering/drizzle-first-persistence.md),
> que aplica a Decisão 004 — a justificativa arquitetural Drizzle-first. A
> composição do adapter é a Decisão 003; a fronteira row × contrato é a
> Decisão 002; o id atravessa como string opaca pela Decisão 014. Esta skill
> não repete os exemplos da baseline — diz o que decidir, em que ordem, e o que
> a entrega precisa provar.

---

## Quando usar

Existe um dado a ler ou gravar, e a pergunta é **como** — qual API do Drizzle,
em que fronteira transacional, em que arquivo do adapter, e com que evidência de
isolamento. É a segunda das quatro fases de construção: o port já existe.

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| Desenhar o port, o caso de uso, o contrato Zod e o `Result` | [`engineering-contract`](../engineering-contract/SKILL.md) |
| Escrever a rota, o mapeamento para HTTP e o client tipado | [`engineering-api`](../engineering-api/SKILL.md) |
| Escrever a tela e as queries do cliente | [`engineering-web`](../engineering-web/SKILL.md) |
| Revisar uma camada Drizzle já escrita, com sondas executáveis | `drizzle-review` |
| Otimizar consulta com evidência de plano e métrica | `postgresql-optimization` |
| Escrever o teste do adapter, ou investigar suíte que falha só junto | `bun-test-build` · `bun-test-review` |
| A tabela ainda não existe e a regra de produto não decidiu o modelo | registre a questão de produto em aberto para o produto construído sobre este starter; o starter não decide comportamento de produto |
| Auditar a vertical inteira contra as fronteiras, sem mudar comportamento | [`engineering-refactor`](../engineering-refactor/SKILL.md) |

---

## Carregamento mínimo

| Ordem | Carregar | Por quê |
| --- | --- | --- |
| 1 | A matriz de decisão em [`drizzle-first-persistence.md`](../../../docs/engineering/drizzle-first-persistence.md) § Decision matrix | a API de menor poder |
| 2 | O port em `packages/core/src/<capability>/contracts.ts` | a operação já tem assinatura |
| 3 | O `README.md` local da fatia em `apps/api/src/features/<feature>/`, quando existe | qual módulo já é dono, e a lista de exceções |
| 4 | Decisão 003 | composição por responsabilidade coesa |
| 5 | `packages/infra/database/src/schema.ts` | constraint, índice e coluna reais; `organization_id` é a coluna tenant |
| 6 | `packages/infra/database/src/workspace.ts` | `applyWorkspaceContext`, `withWorkspaceTransaction`, `withActorWorkspaceTransaction` |
| 7 | Decisão 002 § What each layer validates | row não é contrato |

**O que o starter tem hoje:** só tabelas de identidade do Better Auth
(`users`, `organizations`, `members`, `invitations`, `sessions`, `accounts`,
`two_factors`, `verifications`) e `notification_outbox`. Nenhuma tabela de
negócio tenant-owned, nenhuma policy RLS aplicada. A primeira tabela com
`organization_id` próprio traz a policy, a transação de workspace e a cobertura
negativa do Passo 5 no mesmo PR.

---

## Passo 1 — A API de menor poder

Escolha a API de menor poder que represente **a operação inteira** com clareza,
tipagem e sem perda de atomicidade.

```
O grafo relacional declarado já é o resultado?
├── SIM → tx.query.*
└── NÃO
    ├── precisa de colunas mínimas, alias, join, filtro ou agregação
    │   → tx.select()
    ├── é CRUD, upsert, conflito ou returning
    │   → tx.insert() / tx.update() / tx.delete()
    ├── falta uma expressão PostgreSQL pontual (função, cast, filter)
    │   → sql`...` DENTRO do builder
    └── nenhuma expressão Drizzle equivalente, segura e clara existe
        → tx.execute(sql...) — exceção documentada
```

**O fragmento vira SQL completo no momento em que contém o `SELECT`, `INSERT`,
`UPDATE` ou `DELETE`.** Aí não é mais fragmento.

Lock de linha (`.for('update', { skipLocked: true })`) e CTE com `UPDATE FROM`
são builder — **não justificam SQL completo**. As classes de exceção admitidas
são quatro: contexto RLS (`set_config`/`current_setting`), concorrência que o
builder não expressa com clareza, transformação set-based e JSONB/LATERAL. As
únicas exceções existentes hoje são as chamadas de `set_config` e
`current_setting` em `packages/infra/database/src/workspace.ts`.

SQL completo novo exige **owner, categoria, justificativa e teste
proporcional**, registrados no `README.md` do módulo de persistência, no mesmo
PR (baseline § Maintaining the exception list).

Nunca `sql.raw()` com entrada externa; nunca concatenar identificador, filtro ou
valor. Identificador dinâmico inevitável se restringe a uma lista fechada da
aplicação.

---

## Passo 2 — A transação de workspace

Toda operação em tabela tenant-aware entra por `withWorkspaceTransaction` ou
`withActorWorkspaceTransaction`, de `@twincam/infra-database/workspace`. O
helper aplica `set_config('app.workspace_id', <id>, true)` **dentro** da
transação e confere que foi aplicado; o `tx` entregue é o `WorkspaceTx` com o
builder completo, não um executor só de SQL.

- **`organizationId` vem do contexto autenticado** (`actorContext.organizationId`,
  resolvido em `apps/api/src/features/auth/actor.ts`), nunca de input do
  cliente.
- **RLS é a fronteira obrigatória**; o filtro explícito por `organizationId` no
  `where` é defesa em profundidade e continua obrigatório — ele expressa o
  invariante no código.
- **Operações que compartilham invariante ficam na mesma transação.** Separar
  arquivos não pode quebrar atomicidade (Decisão 003).
- **Transação curta.** Validação pura antes de abrir; nada de HTTP, fila externa
  ou trabalho de CPU longo sob lock.
- **Tabela de identidade global** (`users`, `sessions`, `members`, `accounts`)
  pode ser acessada fora do wrapper quando a operação não é tenant-aware — é o
  que `actor.ts` faz para resolver a membership.

Trocar o executor por uma conexão avulsa dentro de um repository tenant-aware é
achado: o `set_config` não acompanha.

---

## Passo 3 — Onde a operação mora

`repository.ts` de uma fatia com mais de uma responsabilidade persistida é
**composition root**: importa implementações e entrega o objeto que satisfaz o
port. Nada mais (Decisão 003).

```ts
export const createDrizzleUserProvisioningRepository = (): UserProvisioningRepository => ({
  findByEmail: findUserByEmail,
  createVerifiedCredentialUser: createVerifiedCredentialUser,
})
```

**Nunca acrescente SQL, tipo `*Row`, mapper ou regra de persistência a um
`repository.ts` que já compõe.** Antes de escrever a operação, responda:

1. Qual método do port e qual caso de uso a exigem?
2. Qual módulo já possui o dado, o ciclo de mudança e a transação?
3. A operação muda junto com esse módulo, ou tem evidência e manutenção
   próprias?
4. Que testes demonstram o comportamento, a falha e a atomicidade?

Sem owner coeso, crie o módulo irmão — `<responsabilidade>-persistence.ts` ou
`<assunto>-lookups.ts` — e adicione ao composition root. **Não crie um arquivo
por método** nem abstração genérica sem uma segunda necessidade concreta.
Coesão e fronteira transacional têm precedência sobre limite de linhas. A fatia
que passa de um punhado de módulos ganha um `README.md` local com a tabela de
autoridades e a receita para adicionar uma operação (guia da API § Slice README).

---

## Passo 4 — Row não é contrato

Row e projeção Drizzle são **tipos internos**. A conversão para o tipo do Core
acontece num mapper coeso e nomeado, na fronteira de persistência:

```ts
const membershipSelect = {
  organizationId: members.organizationId,
  organizationName: organizations.name,
  organizationSlug: organizations.slug,
  role: members.role,
} as const

type MembershipRow = Awaited<ReturnType<typeof selectMembership>>[number]

const mapActorContext = (row: MembershipRow, userId: string): ActorContext => ({
  organizationId: row.organizationId,
  organizationName: row.organizationName,
  organizationSlug: row.organizationSlug,
  role: row.role,
  userId,
})
```

- Prefira **inferir o tipo da projeção real** a redeclarar o shape à mão.
- Não replique alias `snake_case`, não faça cast amplo da resposta.
- Selecione **apenas as colunas consumidas**; para coleção, join ou leitura
  relacional em lote, nunca uma consulta por item.
- Violação de constraint esperada se trata **aqui** e vira `Result`/erro
  previsto. Mensagem do PostgreSQL e nome de constraint não são contrato —
  `isDuplicateUserError` em `auth.routes.ts` procurando `'duplicate'` na
  mensagem é o que esta regra evita.
- Tipos `*Row` mantêm o primitivo do Drizzle (`string`) e a conversão para
  `EntityId` acontece no mapper — o id atravessa como string opaca (Decisão 014).

Schema interno derivado com `drizzle-zod` fica em Infra
(`packages/infra/database/src/schemas/users.ts`). Contrato público é explícito
no Core — [`engineering-contract`](../engineering-contract/SKILL.md).

---

## Passo 5 — A evidência que uma mudança tenant-aware exige

Mudança que toca isolamento precisa de **cobertura negativa**, não só do caminho
feliz (`AGENTS.md` § Validation; baseline § Security checklist). Os quatro casos
são obrigatórios:

| Caso | O que prova |
| --- | --- |
| **Duas organizações** | a organização B não lê nem escreve a linha da A |
| **`WITH CHECK`** | insert/update não consegue gravar linha de outra organização |
| **Sem contexto** | sem `set_config`, a operação não vê nada — fail-closed |
| **Rollback** | a transação que falha não deixa linha nem contexto vazado |

A camada é integração contra PostgreSQL real, em `*.integration.test.ts`
colocado junto do adapter ([`test-plan.md`](../../../docs/engineering/test-plan.md)
§ 3), rodada por `bun run test` com o banco de pé (`docker compose up -d
postgres` e `bun run db:migrate`). Sem o banco, a camada falha nomeando o
pré-requisito — nunca em silêncio, nunca resumo verde.

Tabela tenant-aware nova entra nessa suíte — não basta a migration criar a
policy. Roles de runtime recebem só os privilégios necessários; role de
migration é outra. Concorrência se testa no PostgreSQL real, preservando ordem
de lock e idempotência. Migration nova se valida em banco limpo antes do merge.

---

## Passo 6 — A lista de exceções

O guardrail é a revisão contra o `README.md` do módulo de persistência e o mapa
`exports` de `@twincam/infra-database`, que publica `./client`, `./schema`,
`./schemas/users` e `./workspace` — nunca um executor de SQL cru (baseline §
Decision matrix).

Ao **adicionar** uma exceção: owner, categoria (`concurrency`, `rls-context`,
`set-based`, `jsonb-lateral`), justificativa e o teste que a cobre, na mesma
entrada. Advisory lock precisa explicar a chave, a ordem de aquisição e o
comportamento de rollback.

Ao **migrar** uma exceção de volta para o builder: remova a entrada **no mesmo
PR**. Não crie teste específico do guardrail para cada migração.

Não existe script dedicado de arquitetura; adicionar um é decisão a revisitar
quando aparecer um ciclo entre packages ou regra condicional por export
([`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md) § Enforcement).

---

## Passo 7 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | A API escolhida é a de menor poder que representa a operação inteira | 004 |
| 2 | Nenhum SQL completo novo sem owner, categoria, justificativa e teste no README do módulo | 004 |
| 3 | Lock de linha e CTE feitos pelo builder, não por SQL completo | 004 |
| 4 | Nenhum `sql.raw()` com entrada externa; nenhum identificador concatenado | 004 |
| 5 | Toda operação tenant-aware dentro de `withWorkspaceTransaction`/`withActorWorkspaceTransaction` | baseline |
| 6 | `organizationId` vem do contexto autenticado, não de input do cliente | baseline |
| 7 | Filtro explícito de `organizationId` no `where`, além do RLS | baseline |
| 8 | Operações que compartilham invariante na mesma transação | 003 |
| 9 | `repository.ts` só compõe: sem SQL, `*Row`, mapper ou regra | 003 |
| 10 | O módulo escolhido é dono do dado, do ciclo de mudança e da transação | 003 |
| 11 | Row convertida por mapper nomeado; nenhuma row devolvida como contrato | 002 |
| 12 | Id sai do mapper como string opaca; nenhum parse de formato | 014 |
| 13 | Só as colunas consumidas são projetadas; coleção sem N+1 | 004 |
| 14 | Constraint esperada tratada na fronteira e convertida em erro previsto | 004 |
| 15 | Mudança tenant-aware cobre duas organizações, `WITH CHECK`, sem contexto e rollback | AGENTS.md |
| 16 | Suíte de integração rodou contra PostgreSQL real, ou o bloqueio ambiental está declarado | test-plan |

---

## Exemplo

Tarefa: *"resolver o contexto do ator — a organização ativa da sessão e o papel
do usuário nela — fixando a organização única quando a sessão não tem uma"*.
Hoje `apps/api/src/features/auth/actor.ts` faz isso com `db` direto; a tarefa é
dar-lhe a forma de adapter. O port já existe: `findActiveMembership` devolve
`ActorContext | null`.

**Passo 1 — a API.** Membership com nome e slug da organização → `select()` com
`innerJoin` em `organizations`, projetando só as quatro colunas consumidas.
Fixar a organização ativa → `update(sessions).set(...)`. Builder cobre. Nada de
SQL completo.

**Passo 2 — a transação.** `sessions`, `members` e `organizations` são tabelas
de identidade globais → fora de `withWorkspaceTransaction`. Mas o invariante
"sessão aponta para uma organização ⇒ o usuário é membro dela" é compartilhado
pela leitura da membership e pela escrita na sessão: as duas ficam **na mesma**
`db.transaction`. O `organizationId` sai da sessão ou da membership única —
nunca de header ou body.

**Passo 3 — onde mora.** `repository.ts` só compõe `findMemberships`,
`findActiveMembership` e `setActiveOrganization`; a implementação fica em
`membership-lookups.ts`, dono do ciclo de mudança dessa responsabilidade
(Decisão 003 cita esse nome).

**Passo 4 — a fronteira.** `mapActorContext` converte a projeção em
`ActorContext`; a row não sobe. Mais de uma membership sem organização ativa é
falha esperada (`no_active_workspace`, 403), tratada aqui. Update que não
retorna linha é exceção — invariante do código.

**Passo 5 — a evidência.** Teste de integração com dois usuários em duas
organizações: o membro de A não resolve contexto em B; a sessão de quem tem
duas memberships não é fixada; rollback quando o update falha não deixa sessão
alterada. Como as tabelas são de identidade, sem policy de workspace, os quatro
casos do Passo 5 chegam com a **primeira tabela tenant-owned** — a fatia que a
criar traz a policy e a suíte no mesmo PR.

**Passo 6 — exceções.** Nenhuma introduzida; o README do módulo não ganha
entrada.

**O que as decisões evitaram:**

| Decisão | Alternativa comum | Fonte |
| --- | --- | --- |
| Join pelo builder | `execute(sql\`select ... join ...\`)` classificado como exceção | 004 |
| Uma transação para ler e fixar | ler a membership e atualizar a sessão em chamadas soltas | 003 |
| Implementação em `membership-lookups.ts` | mais um método com SQL dentro de `repository.ts` | 003 |
| Mapper na fronteira | devolver `typeof members.$inferSelect` como contexto | 002 |
| Cobertura negativa | só o teste de "resolve o membro" na mesma organização | AGENTS.md |

---

## Antipadrões

| Antipadrão | Fonte |
| --- | --- |
| SQL completo para CRUD, projeção, join, lock ou agregação que o builder cobre | 004 |
| Fragmento `sql` que cresceu até conter o comando inteiro | 004 |
| `sql.raw()` com entrada externa; identificador ou filtro concatenado | 004 |
| Exceção nova sem owner, categoria, justificativa e teste no README do módulo | 004 |
| Query tenant-aware fora da transação de workspace | baseline |
| `organizationId` vindo de body, query ou header do cliente | baseline |
| Executor trocado por conexão avulsa dentro do repository tenant-aware | baseline |
| Filtro de `organizationId` omitido "porque o RLS já cobre" | baseline |
| Escritas com invariante compartilhado separadas em transações diferentes | 003 |
| SQL, `*Row`, mapper ou regra adicionados a um `repository.ts` que já compõe | 003 |
| Um arquivo por método do port | 003 |
| Row Drizzle devolvida como contrato público | 002 |
| Cast amplo da resposta em vez de mapper nomeado | 004 |
| `select()` sem projeção, trazendo colunas não consumidas | 004 |
| Uma consulta por item de coleção | 004 |
| Mensagem do PostgreSQL ou nome de constraint vazando no erro HTTP | 004 |
| Mensagem de erro do driver inspecionada por substring para classificar a falha | 004 |
| Mudança tenant-aware entregue só com teste positivo | AGENTS.md |
| Tabela tenant-owned criada sem policy RLS e sem suíte de isolamento no mesmo PR | baseline |
| Migration de índice embutida numa migração sintática, sem evidência própria | 004 |
| `EXPLAIN` pulado antes de otimizar | 004 |
| `packages/infra/database` importando `@twincam/auth` | AGENTS.md |

---

## Passo 8 — Fechar

1. **Passe o bastão.** A rota que consome o repository vai para
   [`engineering-api`](../engineering-api/SKILL.md); a validação proporcional,
   para [`engineering-validation`](../engineering-validation/SKILL.md).
2. **Bloqueio ambiental se reporta, não se esconde.** Suíte de integração que
   não roda por falta de PostgreSQL local é bloqueio declarado com comando,
   causa e evidência faltante — nunca resumo verde.
3. **Dívida encontrada de passagem vira issue própria.** Exceção sem owner,
   índice ausente, tabela sem policy: registre com dono e condição de
   fechamento em vez de inchar a entrega.

---

## Relacionados

- [`drizzle-first-persistence.md`](../../../docs/engineering/drizzle-first-persistence.md) — a fonte operacional
- Decisão 004 · 003 · 002 · 014
- [`engineering-contract`](../engineering-contract/SKILL.md) — o port que este adapter implementa
- [`engineering-api`](../engineering-api/SKILL.md) — quem consome o repository
- [`test-plan.md`](../../../docs/engineering/test-plan.md) — a camada de integração e o ambiente
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; decisão histórica não orienta código novo
