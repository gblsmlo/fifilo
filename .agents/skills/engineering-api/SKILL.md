---
name: engineering-api
description: Escrever e revisar a fronteira HTTP deste starter — rota Elysia fina com schema declarado em `options`, escopo de lifecycle do guard e dos derives, `Result` mapeado para status por `toHttpErrorResponse`, contrato OpenAPI e o client `http/` do Web sobre o Eden — citando as Decisões 005, 002 e 013. Use quando a pergunta for "onde valido esta entrada", "que status este erro vira", "por que este derive vazou para outra rota", "esta rota devia chamar caso de uso ou port" ou "como o Web consome isto". Não use para desenhar o contrato e o caso de uso, que é engineering-contract, para a query e a transação, que é engineering-persistence, nem para a tela, que é engineering-web.
fonte: "docs/engineering/api-implementation-guide.md"
---

# engineering-api

> **Fonte desta skill:** o guia
> [`api-implementation-guide.md`](../../../docs/engineering/api-implementation-guide.md).
> A fronteira de validação é a Decisão 002; o escopo de lifecycle é a Decisão
> 005; o consumo pelo Web é a Decisão 013. Esta skill não repete o guia — diz o
> que decidir e em que ordem.

---

## Quando usar

Existe uma capacidade a expor por HTTP, e a pergunta é **como a fronteira se
comporta**: onde a entrada é validada, o que a rota faz e o que ela delega, que
status cada falha vira, e como o Web consome. É a terceira das quatro fases de
construção: contrato, port e adapter já existem.

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| Desenhar o contrato Zod, o port, o caso de uso e o `Result` | [`engineering-contract`](../engineering-contract/SKILL.md) |
| Escrever a query, a transação e o adapter Drizzle | [`engineering-persistence`](../engineering-persistence/SKILL.md) |
| Escrever a tela, os search params, o loader e as queries | [`engineering-web`](../engineering-web/SKILL.md) |
| Autenticação, sessão e cookie atravessando os apps | [`auth`](../auth/SKILL.md) |
| A mecânica do Elysia em si — handler, cookie, stream, `onError` | `elysia-build` · `elysia-schema` |
| Hook ou plugin que não afeta a rota esperada, fora do padrão da Decisão 005 | `elysia-diagnose` |
| Método, status, header e proteção de escrita concorrente | `http-contract` |
| Frescor, `ETag`, `304` e `If-Match` da rota | `http-cache` |
| Auditar o contrato HTTP já publicado, com sondas `curl` | `http-review` |
| Requisição que o browser bloqueia, ou falha concreta de rede | `http-diagnose` |
| Cache do cliente e invalidação | `tanstack-query` |
| Auditar a vertical inteira contra as fronteiras, sem mudar comportamento | [`engineering-refactor`](../engineering-refactor/SKILL.md) |

---

## Carregamento mínimo

| Ordem | Carregar | Por quê |
| --- | --- | --- |
| 1 | O contrato em `packages/core/src/contracts/<x>.ts` ou `packages/core/src/<capability>/schemas.ts` | os schemas de body, query e response já existem |
| 2 | Uma rota irmã da mesma forma — `apps/api/src/features/users/users.routes.ts` para leitura com `200`, `apps/api/src/features/auth/auth.routes.ts` para escrita com `201` | a composição do módulo é padronizada |
| 3 | `apps/api/src/libs/http-errors.ts` e `apps/api/src/libs/domain-error-status.ts` | `errorStatuses`, `internalErrorStatus`, `mapValidationError`, `toHttpErrorResponse` |
| 4 | `apps/api/src/features/auth/actor-context.ts` e Decisão 005 | `createAuthGuard`, `requireActorContext`, `ActorRejectionError`; `scoped` × `local` |
| 5 | `apps/api/src/app.ts` e `app.test.ts` | a montagem é exercitável por `app.handle()` |
| 6 | O `http/` da feature em `apps/web/src/features/<x>/http/` e `apps/web/src/libs/api-client.ts` | o client pode já existir; `api`, `edenStatus`, `edenCreated` |

---

## Passo 1 — A rota é fina

A sequência canônica, e o que cada linha significa:

```ts
async ({ actorContext, body, set }) => {
  const { organizationId } = requireActorContext(actorContext)
  const result = await useCase({ ...body, organizationId }, repository)
  if (isErr(result)) {
    const { body: error, status } = toHttpErrorResponse(result.error)
    set.status = status
    return error
  }
  set.status = 201
  return serialize(result.value)
}
```

A rota **valida a entrada, obtém o contexto, chama o caso de uso e mapeia a
resposta**. Ela não monta workflow de negócio, não acessa Drizzle e não chama
`auth.$context.internalAdapter` sem boundary.

Chame o port direto quando nenhum dos cinco gatilhos de caso de uso se aplica
([`engineering-contract`](../engineering-contract/SKILL.md) § Passo 3). Não use
`findByEmail` seguido de insert quando o port tem escrita idempotente ou
transacional.

**Autorização de entrada pode estar no guard; a regra de permissão do caso de
uso continua verificável no Core.** As duas não são duplicação: uma barra o
anônimo, a outra decide o que este ator pode fazer com este recurso.

---

## Passo 2 — O schema mora em `options`, e vem do Core

```ts
.post('/sign-up', handler, {
  body: signUpRequestSchema,
  response: { 201: signUpResponseSchema, ...errorStatuses },
})
```

Duas regras da Decisão 002, e o que cada uma custa quando se quebra:

1. **A fronteira valida na fronteira.** `safeParse` no corpo do handler protege
   o dado e **perde o tipo**: Eden e OpenAPI passam a ver `unknown`/`string`, e o
   contrato deixa de existir para quem consome. O handler recebe o tipo
   parseado e não re-parseia (Decisão 012).
2. **O schema mora no Core.** Schema inline na rota é um contrato que o cliente
   não pode importar.

Coerção pertence ao schema, não ao handler: `?includeArchived` declarado como
`z.string()` e comparado com `=== 'true'` faz `?includeArchived=1` virar `false`
calado. `z.stringbool()` resolve na fronteira.

Quando a fronteira precisa de uma variação da lista canônica — um `.catch()`, um
valor a mais — ela **deriva** da declaração do domínio em vez de reescrever.

---

## Passo 3 — `Result` → HTTP, com um envelope só

`toHttpErrorResponse` mapeia todo o conjunto `DomainErrorKind` em exatamente
cinco status:

| `kind` | Status |
| --- | --- |
| `validation` | 400 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |

`errorStatuses` declara os cinco de uma vez, para que a união de erro que o Eden
enxerga seja idêntica em todos os módulos em vez de divergir por arquivo.
Declare `internalErrorStatus` (500) **só** na rota que ainda pode falhar depois
do caso de uso ter sucedido — uma escrita que grava mas cuja releitura volta
vazia. `toHttpErrorResponse` nunca produz 500.

Falha de validação do próprio Elysia vira 400 `invalid_request` por
`mapValidationError` — no `onError` do módulo e, para a montagem inteira, no
`onError` de `createApp()`.

O envelope é `{ error: { code, message } }` (`errorEnvelopeSchema`). **O `code`
é o contrato**; a `message` é diagnóstico. Nome de constraint, mensagem do
PostgreSQL e stack não entram em nenhum dos dois.

**O status da rota é contrato.** `201` continua `201`, `204` continua `204`; o
client normaliza (Passo 6), a rota nunca troca o status para agradar o
consumidor. Declarar `200` e `201` juntos faz o contrato mentir (Decisão 013).

---

## Passo 4 — Escopo de lifecycle: `scoped` para o guard, `local` para o derive

```ts
new Elysia({ prefix: '/api/<capability>' })
  .use(createAuthGuard())
  .derive({ as: 'local' }, ({ actorContext }) => ({
    organizationId: requireActorContext(actorContext).organizationId,
  }))
  .onError(mapValidationError)
```

- **`createAuthGuard()` é plugin nomeado (`actor-context`) e `scoped`**: fornece
  `actorContext` aos handlers do módulo que o monta, e o `name` evita
  duplicação.
- **Derive que transforma `actorContext` em dado do módulo usa `as: 'local'`.**
  Com `scoped`, ele alcança módulos registrados depois em `createApp()` — foi
  assim que, no produto de referência, uma rota de bootstrap executou o derive
  de outro módulo sem o guard e respondeu
  `500 Authenticated actor context is required.`
- **Rejeição é lançada, não retornada.** O guard lança `ActorRejectionError` e
  o próprio `onError` `scoped` a converte em resposta. Um derive `scoped` que
  *retorna* `status(...)` colapsa o `error` do Eden para `unknown` em todas as
  rotas do escopo (Decisão 005).
- **Nada num módulo de feature é `global`.** Só `createApp()` tem hook de app.
- **A validade da composição não depende da ordem dos `.use()` em `app.ts`.**
- **`requireActorContext` é fail-closed**: adapter que chega sem ator lança.
- **Cada módulo testa que seus derives não alcançam rota de outro módulo**
  (`actor-context.test.ts` é o modelo); `app.test.ts` exercita a montagem
  inteira por `app.handle()`.

---

## Passo 5 — As convenções da superfície

- **Prefixo `/api/<capability>`** em toda rota Elysia; `/health` é a única fora
  dele. O prefixo fica no servidor porque Web e API compartilham a origem.
- **Path param malformado é 400 `invalid_request`**, não 404 — entrada inválida
  não é recurso ausente.
- **Listagem usa cursor**, com limite máximo e ordenação determinística; filtro
  e cursor têm schema Zod no Core.
- **Transição de estado é comando explícito** (`POST .../<verbo>`), não `PATCH`
  genérico.
- **Idempotência, concorrência e rollout** seguem
  [`operation.md`](../../../docs/engineering/operation.md); a chave não é
  inventada no handler.
- **Tabela de identidade global** pode ser acessada fora da transação de
  workspace; tudo tenant-aware, não; `organizationId` vem do `actorContext`.
- **O handler do Better Auth** monta com `parse: 'none'` e é catch-all
  `/api/auth/*`; não é tipado nem deve ser.

Uma fatia importa outra **pelo barrel** (`../auth`), nunca por caminho interno.
`@twincam/core/...` e `@twincam/infra-database/...` entram por subpath público,
com a dependência declarada no `package.json` do workspace que importa
(Decisão 001). `apps/api/package.json` publica só `./server`, para que o Web
importe `type App`.

---

## Passo 6 — O client `http/` do Web

O Web consome **o mesmo contrato executável**, pelo Eden treaty sobre `App`
(Decisão 013): `api.<recurso>` de `@libs/api-client`, nunca um literal
`'/api/...'` em código de produção. Tráfego do Better Auth vai pelo
`authClient` de `@twincam/auth/client`. O adapter mora em
`apps/web/src/features/<x>/http/` — **`http/`, nunca `api/`**: "API" é
reservado para `apps/api`.

As duas formas que o repositório usa:

```ts
// leitura com 200 — apps/web/src/features/users/current-user.ts
const { data, error } = await api.me.get()
if (error) {
  if (edenStatus(error) === 401) throw new CurrentUserUnauthenticatedError()
  throw new CurrentUserLoadError(edenStatus(error))
}
return data

// escrita com 201 — apps/web/src/features/auth/http/sign-up.ts
const { data, error } = edenCreated<unknown>(await api.auth['sign-up'].post(payload))
```

- **Status passa por `edenStatus`.** O Eden tipa status como string literal e
  produz número; `error.status === '403'` compila e nunca casa.
- **Rota cujo sucesso não é `200` passa por `edenCreated`.** Ali `data` chega
  como `unknown` e o `safeParse` pelo schema do contrato restaura o tipo. Rota
  com `200` **não** re-parseia: a rota já validou com o mesmo schema, e um
  `schema.parse` no consumidor é segunda fonte.
- **O erro é traduzido por `code`** em classes da feature (`http/errors.ts`);
  401/403 viram um erro nomeado que a tela reconhece como estado.
- **`http/` é puro**: um módulo por chamada, sem React nem router (Decisão 007).
- **O client não reescreve regra de negócio** para decidir o que oferecer: ele
  consulta o mesmo módulo que o servidor consulta (Decisão 002, regra 4).

---

## Passo 7 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | A rota valida, obtém contexto, chama e mapeia — sem workflow de negócio | guia da API |
| 2 | Nenhum acesso a Drizzle ou a `auth.$context.internalAdapter` dentro da rota | guia da API |
| 3 | Body, query, params e response declarados em `options`, não no handler | 002 |
| 4 | Os schemas vêm do Core, não inline; o handler não re-parseia | 002 · 012 |
| 5 | Coerção feita pelo schema; nenhum `=== 'true'` no handler | 002 |
| 6 | Variação de lista deriva da declaração canônica do domínio | 002 |
| 7 | Falha esperada mapeada por `toHttpErrorResponse`, com `errorStatuses` declarado | 002 |
| 8 | 500 declarado só onde a rota pode falhar depois do caso de uso ter sucedido | libs |
| 9 | `code` estável no envelope; sem constraint, SQL ou stack na `message` | 004 |
| 10 | Status de sucesso é o real (`201` fica `201`); nunca `200` e `201` juntos | 013 |
| 11 | Guard `scoped` e nomeado; derive de módulo com `as: 'local'`; rejeição lançada | 005 |
| 12 | A composição não depende da ordem dos `.use()` em `app.ts` | 005 |
| 13 | Teste provando que o derive do módulo não alcança rota de outro módulo | 005 |
| 14 | `organizationId` do `actorContext`, nunca de input do cliente | guia da API |
| 15 | Listagem com cursor, limite máximo e ordenação determinística | convenções |
| 16 | Client em `http/`, por `api.<recurso>`, `edenStatus` e `edenCreated` onde cabe | 013 |
| 17 | Nenhum `schema.parse` no consumidor de rota `200` | 013 |
| 18 | Import de fatia pelo barrel; dependência declarada no manifesto | 001 |
| 19 | Teste de rota positivo e negativo, incluindo autorização e membership | guia da API |
| 20 | Documento OpenAPI coerente quando rota ou contrato mudou | delivery flow |

---

## Exemplo

Tarefa: *"expor `POST /api/auth/sign-up` chamando o caso de uso `signUp`"*. O
contrato (`contracts/auth.ts`), o caso de uso e o repository já existem.

**Passo 1 — fina.** A rota chama `signUp({ ...body }, repository)` e mapeia.
`signUp` avalia política (e-mail livre) e coordena duas escritas — os gatilhos
estão presentes; a rota não chama o port direto, e o `findUserByEmail` seguido
de `provisionUser` que hoje vive no handler desaparece.

**Passo 2 — a fronteira.** `body: signUpRequestSchema` e
`response: { 201: signUpResponseSchema, ...errorStatuses }`, ambos de
`@twincam/core/contracts/auth`. O Eden e o OpenAPI documentam `min(12)` da
senha em vez de `string`.

**Passo 3 — os erros.** E-mail em uso → `conflictError` → 409. Body malformado →
`mapValidationError` → 400 `invalid_request`. `internalErrorStatus` entra só se
a releitura pós-criação puder voltar vazia; caso contrário, nenhum 500
declarado. `isDuplicateUserError` lendo `'duplicate'` na mensagem do driver sai:
a classificação da constraint é do adapter.

**Passo 4 — o lifecycle.** Cadastro é anônimo: sem guard. Um módulo que precise
do ator monta `createAuthGuard()` e deriva `organizationId` com `as: 'local'`,
para que `/api/me` — que precisa responder mesmo sem organização ativa — não
receba um derive alheio por acidente de montagem.

**Passo 5 — as convenções.** `POST /api/auth/sign-up` responde `201`; o
handler do Better Auth continua catch-all em `/api/auth/*` com `parse: 'none'`.

**Passo 6 — o Web.** `signUp` em `features/auth/http/sign-up.ts` chama
`api.auth['sign-up'].post(payload)`, passa por `edenCreated`, restaura o tipo
com `signUpResponseSchema.safeParse` e traduz o `code` em `AuthRequestError`;
`useSignUpForm` roteia `conflict` para o campo de e-mail.

**O que as decisões evitaram:**

| Decisão | Alternativa comum | Fonte |
| --- | --- | --- |
| Schema em `options` | `safeParse(body)` no handler, com `unknown` no Eden | 002 |
| Schema no Core | `z.object({...})` inline na rota, invisível ao cliente | 002 |
| `errorStatuses` compartilhado | união de erro diferente por módulo | libs |
| Derive `local` | derive de feature alcançando `/api/me` e derrubando o bootstrap | 005 |
| `api.auth['sign-up'].post` | `apiFetch('/api/auth/sign-up')` com o path duplicado no cliente | 013 |
| `edenStatus(error) === 401` | `error.status === '401'` compilando e nunca casando | 013 |

---

## Antipadrões

| Antipadrão | Fonte |
| --- | --- |
| `safeParse` no corpo do handler em vez de schema em `options` | 002 |
| Schema de fronteira declarado inline na rota | 002 |
| Coerção manual de query (`=== 'true'`, `Number(x)`) dentro do handler | 002 |
| Cast (`as`) para o comando de domínio aceitar o que a fronteira não validou | 002 |
| Rota montando workflow de negócio em vez de chamar caso de uso | guia da API |
| Rota acessando Drizzle ou `auth.$context.internalAdapter` direto | guia da API |
| `findByEmail` seguido de insert quando o port tem escrita idempotente | guia da API |
| Status HTTP decidido dentro do Core | 002 |
| 500 declarado em rota que não pode falhar depois do caso de uso | libs |
| Envelope de erro divergente por módulo | libs |
| Nome de constraint, SQL ou stack vazando na `message` | 004 |
| Rota de criação em `200`, ou `200` e `201` declarados juntos | 013 |
| Derive de módulo com escopo `scoped`; hook `global` em módulo de feature | 005 |
| Derive ou `onBeforeHandle` `scoped` retornando `status(...)` | 005 |
| Ordem de `.use()` em `app.ts` usada para evitar vazamento de contexto | 005 |
| `organizationId` lido de body, query ou header do cliente | guia da API |
| Path param malformado respondido como 404 | 002 |
| `PATCH` genérico no lugar de comando explícito de transição | convenções |
| Listagem sem cursor, sem limite máximo ou sem ordenação determinística | convenções |
| Client do Web em `api/` em vez de `http/` | AGENTS.md |
| `apiFetch('/api/...')` literal em código de produção | 013 |
| `error.status` comparado direto em vez de `edenStatus` | 013 |
| `schema.parse` no consumidor de uma rota `200` | 013 |
| Regra de negócio reescrita no cliente em vez de consultada no mesmo módulo | 002 |
| Fatia importando outra por caminho interno em vez do barrel | 001 |

---

## Passo 8 — Fechar

1. **Passe o bastão.** A tela que consome o client vai para
   [`engineering-web`](../engineering-web/SKILL.md); a validação proporcional,
   para [`engineering-validation`](../engineering-validation/SKILL.md).
2. **Mudança de contrato se declara.** Status, código de erro ou shape que muda
   entra no PR como mudança de contrato, com o consumidor conferido e o
   OpenAPI coerente — mesmo quando nenhum cliente usa o campo hoje.
3. **Lacuna de produto volta ao começo.** Regra que nenhuma fonte deste
   repositório decide não vira default no handler: registre a questão de
   produto em aberto para o produto construído sobre este starter.

---

## Relacionados

- [`api-implementation-guide.md`](../../../docs/engineering/api-implementation-guide.md) — a fonte
- Decisão 005 · 002 · 013 · 012 · 001
- [`operation.md`](../../../docs/engineering/operation.md) — idempotência, concorrência, migrações e rollout
- [`engineering-contract`](../engineering-contract/SKILL.md) · [`engineering-persistence`](../engineering-persistence/SKILL.md) — as fases anteriores
- [`engineering-web`](../engineering-web/SKILL.md) — quem consome o client
- [`auth`](../auth/SKILL.md) — sessão e cookie atravessando os apps
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; decisão histórica não orienta código novo
