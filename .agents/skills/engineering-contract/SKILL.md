---
name: engineering-contract
description: Desenhar a camada de dentro de uma entrega neste starter — o contrato Zod público em `packages/core/src/contracts`, o port da capacidade, o caso de uso e o `Result` — citando as Decisões 002, 012, 001 e 003. Use quando a pergunta for "isto é contrato público ou tipo interno", "esta regra vai na rota ou no caso de uso", "que erro este caso de uso devolve", "quem é o dono desta lista de valores", "isto mora no kernel ou na capacidade" ou "o port já cobre esta operação". Não use para escrever a query Drizzle e a transação, que é engineering-persistence, para a rota HTTP e o client tipado, que é engineering-api, nem para a tela, que é engineering-web.
fonte: "Decisão 002"
---

# engineering-contract

> **Fonte desta skill:** Decisão 002, que fixa o fluxo Web → contrato Zod →
> adapter HTTP → caso de uso → port → adapter Drizzle e diz o que cada camada
> valida e o que nunca se repete. Decisão 012 fixa que o Zod declara na
> fronteira, o tipo infere e o kernel guarda só o que mais de uma capacidade
> aplica. Decisão 001 fixa as fronteiras de package; Decisão 003 fixa que o
> port representa a necessidade do caso de uso, não a forma do banco. O guia
> operacional é
> [`packages-implementation-guide.md`](../../../docs/engineering/packages-implementation-guide.md).
> Esta skill não repete o texto das decisões — diz o que decidir e em que
> ordem.

---

## Quando usar

Existe uma capacidade a criar ou alterar, e a pergunta é **o que o Core
declara**: o contrato que atravessa a fronteira, o port que o caso de uso
consome, e o erro que ele devolve. É a primeira das quatro fases de construção
([`feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md)).

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| Escrever a query, a transação de workspace e o adapter | [`engineering-persistence`](../engineering-persistence/SKILL.md) |
| Escrever a rota Elysia, o mapeamento para HTTP e o client tipado | [`engineering-api`](../engineering-api/SKILL.md) |
| Escrever a tela, os search params e as queries | [`engineering-web`](../engineering-web/SKILL.md) |
| A regra de produto ainda não existe ou está em disputa | registre a questão de produto em aberto para o produto construído sobre este starter; o starter não decide comportamento de produto |
| Auditar a vertical inteira contra as fronteiras, sem mudar comportamento | [`engineering-refactor`](../engineering-refactor/SKILL.md) |
| Escrever o schema Zod em si — borda HTTP, ou formulário | `elysia-schema` · `react-hook-form` · `zod-validation-expert` |
| Desenhar método, status, header e concorrência da rota pública | `http-contract` |
| Decidir em que nível o comportamento é testado, e derivar os casos | `teste-design` |
| Escrever o teste de unidade do caso de uso | `bun-test-build` |

---

## Carregamento mínimo

| Ordem | Carregar | Por quê |
| --- | --- | --- |
| 1 | Decisão 002 | o fluxo e quem valida o quê |
| 2 | Decisão 012 | Zod declara, tipo infere; kernel × capacidade |
| 3 | `packages/core/src/contracts/auth.ts` | a forma de referência de um contrato: blocos internos sem `export`, tudo `z.infer` |
| 4 | `packages/core/src/<capability>/` quando já existe | o port e o caso de uso podem já existir |
| 5 | `packages/core/src/result.ts` · `errors.ts` · `primitives.ts` | `Result`, os cinco `kind` de `DomainError`, `EntityId` |
| 6 | Decisão 003 | o port é a necessidade do caso de uso, não a tabela |
| 7 | `packages/core/package.json` § `exports` | o subpath que o consumidor vai importar |

**A regra de produto vem antes.** Comportamento que nenhuma fonte deste
repositório decide não vira default silencioso no caso de uso: registre a
questão de produto em aberto para o produto construído sobre este starter.

---

## Passo 1 — Três coisas que não são a mesma

```
Este tipo atravessa a fronteira HTTP?
├── SIM → CONTRATO PÚBLICO
│         schema Zod explícito em packages/core/src/contracts/<x>.ts
│         (ou em packages/core/src/<capability>/schemas.ts — Passo 2)
│         Web importa; tipo é inferido do schema, nunca declarado em paralelo
│
├── NÃO, é a necessidade do caso de uso → PORT
│         type em packages/core/src/<capability>/contracts.ts
│         TypeScript puro, sem schema: typecheck já prova os dois lados
│         o adapter implementa; o Core nunca conhece quem implementa
│
└── NÃO, é a forma do que está gravado → SCHEMA INTERNO
          derivado do Drizzle com drizzle-zod, mora em Infra
          (packages/infra/database/src/schemas/users.ts é o modelo)
          nunca é contrato público, nunca vaza para o Web
```

**Contrato público não se deriva de schema Drizzle.** A seleção de campos e a
serialização são explícitas (Decisão 002). Uma row Drizzle devolvida como
resposta é achado.

**Um contrato, um tipo.** O tipo que atravessa a fronteira é inferido do schema
(`z.infer`). Interface paralela declarando o mesmo shape é a segunda fonte que a
Decisão 012 existe para evitar. Variação deriva: `.pick()`, `.partial()`,
`.extend()` — nunca os campos reescritos.

**Port e comando não ganham schema.** Dentro do processo, TypeScript puro está
correto; um schema que só repete o que o compilador garante é espelho, não
contrato (Decisão 012).

---

## Passo 2 — Onde o contrato mora

| Coisa | Lugar | Consumidor |
| --- | --- | --- |
| Schema de body, query, params e response que mais de uma capacidade aplica | `packages/core/src/contracts/<x>.ts` (kernel) | rota Elysia e `http/` do Web |
| Contrato que só uma capacidade consome | `packages/core/src/<capability>/schemas.ts`, subpath `./<capability>` no `package.json` | a rota e o `http/` daquela capacidade |
| Port de persistência | `packages/core/src/<capability>/contracts.ts` | o caso de uso e o adapter da API |
| Caso de uso | `packages/core/src/<capability>/use-cases/<verbo>-<x>.ts` | a rota |
| `Result`, `DomainError`, `EntityId` | `packages/core/src/result.ts` · `errors.ts` · `primitives.ts` | tudo acima |

**Schema declarado inline na rota é um contrato que o cliente não pode
importar** (Decisão 002, regra 2). Se a rota valida, o schema mora no Core.

**O critério kernel × capacidade é mensurável** (Decisão 012): se algum arquivo
em `packages/core/src/<outra>/` consome o schema, é kernel; se só `apps/`
consome, é da capacidade. `publicUserSchema` em `contracts/users.ts` é kernel
porque Auth e qualquer capacidade que mostre uma pessoa o consomem. Hoje o
kernel tem `auth.ts`, `users.ts` e `health.ts`; ele **não** é o destino
padrão da segunda capacidade.

**Exportar é decisão, não default.** O array que alimenta `z.enum()` é `const`
privado, como `signUpErrorCodeSchema` em `contracts/auth.ts`. Export sem
consumidor é achado.

---

## Passo 3 — Quando extrair um caso de uso

A rota chama um caso de uso quando precisa de qualquer um destes
([`api-implementation-guide.md`](../../../docs/engineering/api-implementation-guide.md)):

- carregar contexto de mais de uma entidade;
- avaliar uma política e depois executar uma escrita;
- gerar ID, referência, auditoria ou chave de idempotência;
- ser reusada por worker, job ou outro adapter;
- coordenar mais de uma operação do repository.

Nenhum deles: a rota chama o port direto. Não se cria caso de uso para
atravessar um método.

**O caso de uso recebe um comando explícito e as dependências por port.** Ele
não recebe o `Request`, o contexto do Elysia nem o `tx`. O comando é tipado
pelo contrato, não por um primitivo largo (Decisão 012): o cadastro recebe
`SignUpRequest`, nunca `{ email: string; name: string; password: string }`
soletrado de novo.

```ts
export const signUp = async (
  command: SignUpRequest,
  repository: UserProvisioningRepository,
): Promise<Result<SignUpResponse['user'], DomainError<'conflict'>>> => { /* ... */ }
```

---

## Passo 4 — `Result` para falha esperada, exceção para o resto

Falha esperada é `Result` (`@fifilo/core/result`); o adapter mapeia para HTTP.
Os cinco `kind` de `DomainError` (`@fifilo/core/errors`) são o vocabulário
fechado, e o mapa para status vive na API (`apps/api/src/libs/domain-error-status.ts`):

| `DomainErrorKind` | Construtor | Status | Quando |
| --- | --- | --- | --- |
| `validation` | `validationError` | 400 | comando malformado ou fora do catálogo |
| `unauthorized` | `unauthorizedError` | 401 | sem ator |
| `forbidden` | `forbiddenError` | 403 | ator sem a permissão |
| `not_found` | `notFoundError` | 404 | recurso ausente para esta organização |
| `conflict` | `conflictError` | 409 | invariante que o estado atual recusa |

```ts
if (existing) {
  return err(conflictError('conflict', 'Ja existe uma conta com este e-mail.'))
}
```

**O `code` é contrato, a `message` não.** O client roteia por `code`
(`useSignUpForm` põe `conflict` dentro do campo de e-mail); a cópia da tela é
do Web. Não devolva mensagem do PostgreSQL, nome de constraint nem stack como
`message`.

Falha inesperada — invariante do próprio código, escrita que não retornou linha
— é exceção, não `Result`. `toHttpErrorResponse` nunca produz 500 justamente
porque 500 não é falha esperada.

---

## Passo 5 — Um fato, um dono

A pergunta da Decisão 002: **o que acontece se as duas camadas discordarem?**

- Discordância produz **UX ruim num sistema correto** → defesa em profundidade,
  pode repetir. É o caso de validar forma no cliente e na fronteira.
- Discordância produz **sistema incorreto** → é a mesma regra com dois donos.
  Débito esperando divergir.

Lista de valores válidos e default se declaram **uma vez** e se reexportam.
Quando a fronteira precisa de variação — um `.catch()`, um valor a mais — ela
**deriva** da declaração canônica em vez de reescrever.

O caso do repositório: a regra da senha (`min(12)`) mora em
`signUpRequestSchema`. O schema do formulário
(`apps/web/src/features/auth/schemas/sign-up-form.ts`) faz `.extend()` para a
confirmação — camada de UX — sem redeclarar o invariante;
`password-requirements.ts` dá feedback consultando a mesma regra; e o servidor
continua recusando. Se alguém copiasse `12` para o formulário, os dois
concordariam até o dia em que o contrato mudasse.

---

## Passo 6 — O que o Core nunca faz

- **Não importa** Elysia, Better Auth, Drizzle, `@fifilo/infra-database`,
  `@fifilo/infra-env` nem `@fifilo/observability`. O `package.json` do Core
  declara só `zod`.
- **Não conhece** tabela, coluna, `tx` nem nome de constraint.
- **Não faz** trabalho no barrel raiz — `packages/core/src/index.ts` é vazio de
  propósito; sem parse de env, conexão ou setup.
- **Não devolve** status HTTP; devolve `Result` e deixa o adapter mapear.
- **Não deriva** contrato público de schema Drizzle.
- **Não tipa** o id além de string opaca: `EntityId` é brand, não formato
  (Decisão 014).

Consumo sempre por subpath público (`@fifilo/core/contracts/auth`,
`@fifilo/core/result`, `@fifilo/core/<capability>`), nunca por caminho
interno de outro workspace. A fronteira é imposta pelo mapa `exports` de cada
package, pela ausência de `@fifilo/*` nos paths do `tsconfig.base.json` e por
teste de fronteira no package quando a regra é barata de afirmar (Decisão 001).

---

## Passo 7 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | O que atravessa HTTP é schema Zod explícito no Core, não row nem tipo derivado do Drizzle | 002 |
| 2 | O tipo é inferido do schema; não existe interface paralela para o mesmo contrato | 012 |
| 3 | Nenhum schema de fronteira declarado inline na rota | 002 |
| 4 | Schema no kernel só se outra pasta de `packages/core/src/` o consome; senão, em `<capability>/schemas.ts` | 012 |
| 5 | Só o que atravessa o arquivo é exportado; o array de `z.enum()` é `const` privado | 012 |
| 6 | O port expressa a necessidade do caso de uso, não a forma da tabela; port e comando sem schema | 003 · 012 |
| 7 | Caso de uso extraído só quando um dos cinco gatilhos se aplica | guia da API |
| 8 | Comando tipado pelo contrato e dependências por port; sem `Request`, contexto Elysia ou `tx` | guia da API · 012 |
| 9 | Falha esperada é `Result` com o `kind` certo; inesperada é exceção | 002 |
| 10 | Lista de valores e default têm um dono só; a variação deriva | 002 |
| 11 | Core sem import de Elysia, Auth, Drizzle, Infra ou observability | 001 |
| 12 | Consumo por subpath público, com a dependência declarada no manifesto do package | 001 |
| 13 | Id atravessa a fronteira como string opaca | 014 |
| 14 | Teste do caso de uso cobre sucesso, cada falha esperada e o invariante | guia da API |

---

## Exemplo

Tarefa: *"o cadastro por credencial precisa recusar e-mail já usado e devolver
o usuário criado"*. Hoje `apps/api/src/features/auth/auth.routes.ts` monta
esse workflow dentro do handler; a tarefa é dar-lhe a forma da Decisão 002.

**Passo 1 — as três coisas.** `SignUpRequest` e `SignUpResponse` atravessam
HTTP → contrato público, já em `contracts/auth.ts`. `UserProvisioningRepository`
(`findByEmail`, `createVerifiedCredentialUser`) é o que o caso de uso precisa →
port, TypeScript puro. A linha de `users` com `emailVerified` e `createdAt` →
schema interno, `internalUserRowSchema` em Infra.

**Passo 2 — onde mora.** `publicUserSchema` fica no kernel (`contracts/users.ts`)
porque Auth e Users o consomem. O port e o caso de uso vão para
`packages/core/src/auth/`, publicados por `./auth` no `package.json`.

**Passo 3 — caso de uso.** Gatilhos presentes: avalia política (e-mail livre) e
depois escreve; coordena duas operações (criar usuário, vincular conta
`credential`). Extrai `signUp(command, repository)`. Não há `findByEmail`
seguido de insert se o port oferece escrita idempotente — a decisão é do
adapter ([`engineering-persistence`](../engineering-persistence/SKILL.md)).

**Passo 4 — erros.** E-mail em uso → `conflictError('conflict', ...)` → 409; o
`code` já é fixado por `signUpErrorCodeSchema`. Body malformado nunca chega ao
caso de uso: a rota o recusa em `options`. Provisionamento que não devolve
usuário → exceção, não `Result`.

**Passo 5 — um dono.** A regra da senha mora em `signUpRequestSchema`; o
formulário estende, não redeclara.

**Passo 6 — a fronteira.** O caso de uso recebe `repository`; ele não sabe que
existe `auth.$context.internalAdapter`, `accounts` nem transação.

**O que as decisões evitaram:**

| Decisão | Alternativa comum | Fonte |
| --- | --- | --- |
| Contrato Zod explícito | `createSelectSchema(users)` publicado como resposta | 002 |
| Comando tipado por `SignUpRequest` | `{ email: string; name: string; password: string }` reescrito no caso de uso | 012 |
| Port pela necessidade | `UsersRepository` com um método por query do adapter | 003 |
| `Result` no Core | caso de uso lançando erro com status 409 | 002 |
| Regra da senha com um dono | `min(12)` repetido no schema do formulário | 002 |
| Port em `packages/core/src/auth/` | schema privado de Auth despejado no kernel | 012 |

---

## Antipadrões

| Antipadrão | Fonte |
| --- | --- |
| Row ou tipo `*Row` devolvido como contrato público | 002 |
| Contrato público derivado de schema Drizzle | 002 |
| Interface TypeScript paralela ao schema Zod do mesmo contrato | 012 |
| Campos de um contrato reescritos em vez de `.pick()`/`.partial()`/`.extend()` | 012 |
| Schema em port ou comando de caso de uso, espelhando o que o compilador prova | 012 |
| Contrato de uma capacidade só despejado no kernel | 012 |
| Export sem consumidor; array de `z.enum()` exportado | 012 |
| `safeParse` no corpo do handler em vez de schema em `options` | 002 |
| Schema de fronteira declarado inline na rota | 002 |
| Regra de negócio reescrita no cliente para decidir o que oferecer | 002 |
| Lista de valores ou default com mais de um dono | 002 |
| Caso de uso recebendo `Request`, contexto Elysia ou `tx` | guia da API |
| Caso de uso criado só para atravessar um método do port | guia da API |
| Port desenhado por tabela, com um método por query | 003 |
| `Result` usado para falha inesperada, ou exceção para falha esperada | 002 |
| Mensagem do PostgreSQL ou nome de constraint como `message` do erro | 004 |
| Core importando Elysia, Auth, Drizzle, Infra ou observability | 001 |
| Import por caminho interno de outro workspace | 001 |
| Barrel raiz do package fazendo parse de env, conexão ou setup | 001 |
| Id tipado por formato (UUID, prefixo) em vez de string opaca | 014 |

---

## Passo 8 — Fechar

1. **Passe o bastão.** O adapter que implementa o port vai para
   [`engineering-persistence`](../engineering-persistence/SKILL.md); a rota e o
   client, para [`engineering-api`](../engineering-api/SKILL.md).
2. **Lacuna de produto volta ao começo.** Regra que nenhuma fonte deste
   repositório decide não vira default silencioso no caso de uso: registre a
   questão de produto em aberto para o produto construído sobre este starter.
3. **Mudança de contrato se declara.** Shape, `code` ou status que muda entra
   no PR como mudança de contrato, com o consumidor conferido — mesmo quando
   nenhum cliente usa o campo hoje.

---

## Relacionados

- Decisão 002 — a fonte
- Decisão 012 · 001 · 003 · 014
- [`packages-implementation-guide.md`](../../../docs/engineering/packages-implementation-guide.md) — o guia operacional dos packages
- [`feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md) — a ordem de uma fatia vertical
- [`engineering-persistence`](../engineering-persistence/SKILL.md) · [`engineering-api`](../engineering-api/SKILL.md) · [`engineering-web`](../engineering-web/SKILL.md) — as fases seguintes
- [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md) — quem é dono de cada responsabilidade
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; decisão histórica não orienta código novo
