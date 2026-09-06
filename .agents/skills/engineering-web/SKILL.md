---
name: engineering-web
description: Compor a tela do `apps/web` deste starter — rota fina, contrato de search params com Zod em `route-search.ts`, page em `features/<feature>/pages/`, page provider só com estado de rota compartilhado, formulário em duas superfícies (container e `*FormFields`) e a página também coberta por story — citando as Decisões 007, 006, 009 e 013. Use quando uma tela precisa de search params, loader com prefetch inicial, schema Zod na borda, page provider, ou quando um arquivo `*-page` está acumulando responsabilidades de router. Não use para o contrato e o caso de uso, que é engineering-contract, para a rota HTTP e o client tipado, que é engineering-api, nem para decidir se o componente é `ui`, `patterns` ou feature, que é design-system.
fonte: "Decisão 007"
---

# engineering-web

> **Fonte desta skill:** Decisão 007, que fixa a árvore modelo de uma feature
> em `apps/web/src/features/` — `apps/web/src/features/auth` é o modelo. A
> escada de propriedade de componente é a Decisão 006; story como camada de
> teste é a Decisão 009; o consumo da API pelo Eden é a Decisão 013. O guia
> operacional é [`feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md)
> § 5. Esta skill não repete as decisões — diz o que decidir e em que ordem.

---

## Quando usar

Existe uma tela a compor ou refatorar, e a pergunta é **a forma neste repo**:
que arquivo guarda o quê, o que é estado de URL, onde a página se divide e em
que camada ela é testada. É a quarta das quatro fases de construção: o
contrato, o adapter e o client `http/` já existem.

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| Contrato Zod público, port, caso de uso e `Result` | [`engineering-contract`](../engineering-contract/SKILL.md) |
| Query Drizzle, transação de workspace e adapter | [`engineering-persistence`](../engineering-persistence/SKILL.md) |
| Rota Elysia, mapeamento para HTTP e o client `http/` da feature | [`engineering-api`](../engineering-api/SKILL.md) |
| Onde o componente mora — `ui`, `patterns`, `layouts` ou feature; shell × vitrine; story obrigatória | [`design-system`](../design-system/SKILL.md) |
| Escrever o componente com os primitivos de `@fifilo/ui` | `coss` |
| Escrever a story da superfície, ou o teste de interação dentro dela | `storybook-story` · `storybook-test` |
| Escrever componente ou Hook novo, e decidir quem é dono do estado | `react-developer` |
| Revisar componente que já existe contra as Rules of React | `react-review` |
| Formulário com validação, campo condicional e lista dinâmica | `react-hook-form` |
| `staleTime`, invalidação depois de escrever, update otimista, paginação | `tanstack-query` |
| Aninhar rota, `<Link>`, contexto de rota, guarda, code splitting; a mecânica de `validateSearch` e do loader | `tanstack-router` |
| Jornada do usuário ponta a ponta | `playwright-build` |
| A regra de produto ainda não existe ou está em disputa | registre a questão de produto em aberto para o produto construído sobre este starter; o starter não decide comportamento de produto |
| Auditar a vertical inteira contra as fronteiras, sem mudar comportamento | [`engineering-refactor`](../engineering-refactor/SKILL.md) |

---

## Carregamento mínimo

| Ordem | Carregar | Por quê |
| --- | --- | --- |
| 1 | [`references/docs.md`](references/docs.md) | a lista de arquivos de referência da feature modelo |
| 2 | Decisão 007 | a árvore modelo e as regras de `index.ts`, `pages/`, `components/`, `http/` |
| 3 | `apps/web/src/features/auth/` | o modelo vivo: `index.ts`, `pages/`, `components/forms/`, `hooks/`, `http/`, `schemas/`, `feedback.ts`, `storybook/` |
| 4 | `apps/web/src/routes/(auth)/sign-up.tsx` e `(authenticated)/route.tsx` | a rota fina e a guarda de sessão |
| 5 | `AGENTS.md` § apps/web | as regras que nenhum gate pega |
| 6 | [`test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1 | qual camada testa o quê |

---

## Passo 1 — Três níveis, três donos

Rota e dado remoto passam por três decisões diferentes, e confundi-las é o que
faz alguém procurar regra no lugar errado:

| Nível | Pergunta | Dono |
| --- | --- | --- |
| **Escolha da ferramenta** | isto é estado de servidor, de URL, de formulário ou efêmero? | `AGENTS.md`: server state em TanStack Query, URL state em TanStack Router, form state em React Hook Form, Zustand só para UI efêmera |
| **Forma neste repo** | que arquivo guarda o quê, e como a tela se divide | **esta skill** — `route-search.ts`, page em `pages/`, provider só com estado de rota compartilhado, `http/` puro |
| **Mecânica da biblioteca** | como se faz, e qual valor usar | `tanstack-router` e `tanstack-query` |

*"Onde mora o schema de search params"* é esta skill (`route-search.ts`);
*"como o `validateSearch` transforma `unknown` em search state"* é
`tanstack-router`. *"Qual `staleTime`, e o que invalidar depois do POST"* é
`tanstack-query` — esta skill não tem opinião sobre isso.

---

## Passo 2 — A rota é fina, a feature é a dona

```
A rota precisa de search params?
├── SIM → contrato Zod em features/<feature>/route-search.ts
│         a rota faz só validateSearch, loaderDeps, loader, guardas e render da page
└── NÃO → sem route-search.ts (nunca arquivo especulativo)

O loader e os hooks consomem o mesmo recurso?
├── SIM → query options compartilhadas em features/<feature>/query-options.ts
│         mesmo queryKey/queryFn no loader e no useQuery
└── NÃO → sem query-options.ts

Vários filhos precisam do mesmo estado da rota?
├── SIM → <feature>-page-context.tsx em pages/, concentrando getRouteApi(...)
│         expõe ações semânticas, não callbacks genéricos de navigate
└── NÃO → sem provider; a page importa composições e passa props
```

- A rota em `apps/web/src/routes/(grupo)/*.tsx` importa a page de
  `@features/<feature>` (o `index.ts`) e faz só carregamento, redirect e
  composição. Import profundo de rota para dentro da feature é achado.
- Grupos de rota são `(grupo)/route.tsx`; a guarda de sessão é
  `(authenticated)/route.tsx`, via `loadAuthenticatedRoute` de
  `features/auth/route-guard.ts`.
- **Um tier por arquivo em `pages/`.** Uma page exporta uma composição; page de
  wiring e composição livre da mesma entidade têm nomes distintos.
- `components/` não conhece o router: navegação, search params e loader ficam em
  `pages/` e `route-guard.ts`. Um formulário recebe callbacks.
- Um shell recebe o ambiente por prop; a rota é o único leitor.

---

## Passo 3 — O formulário tem duas superfícies

A forma de `components/forms/sign-up-form.tsx` (Decisão 007; delivery flow § 5):

| Superfície | Dono de | Quem monta |
| --- | --- | --- |
| **Container** (`SignUpForm`) | chama o hook (`useSignUpForm`), que é dono de rede, navegação e toast | a page |
| **`*FormFields`** (`SignUpFormFields`) | campos, validação pelo schema, `onSubmit` delegado; lê o form por `useFormContext` | a story, com um `FormProvider` de teste |

- O hook em `hooks/use-<x>-form.ts` chama o `http/` da feature, roteia o
  `code` do erro (conflito vai para o campo; o resto vai para o toast) e navega.
- O schema do formulário em `schemas/<x>-form.ts` é camada de UX sobre o
  contrato: `signUpRequestSchema.extend({ confirmPassword })` — reusa a regra do
  campo, nunca redeclara o invariante (Decisão 002, regra 5).
- Texto de toast mora em `feedback.ts`; mensagem de servidor usada em story mora
  em `storybook/<feature>-story-fixtures.ts`, fora da árvore de produção. Assim a
  story exibe exatamente o texto que o hook emite.
- `http/` é puro: um módulo por chamada Eden, `edenStatus`/`edenCreated` de
  `@libs/api-client`, erros traduzidos em classes de `http/errors.ts`
  ([`engineering-api`](../engineering-api/SKILL.md) § Passo 6).

---

## Passo 4 — A página também é testada por story

**Story não é documentação — é a camada de teste de componente** (Decisão 009),
a única que roda em navegador de verdade fora do E2E. Vale para página, não só
para componente: `apps/storybook/src/stories/pages/register.stories.tsx` monta
`SignUpPage` com `withAuthLayout` e `withAuthRoute` e afirma o heading e o
campo.

**Antes de escrever, escolha a camada** ([`test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1):

```
O comportamento depende de layout, foco real, portal, pointer ou a11y,
ou é interação do usuário?
├── SIM → story com play — bun run storybook:test
└── NÃO
    ├── lógica de componente, derivação, formatação, branch sem DOM real
    │   → bun test — bun run test  (ex.: password-requirements.test.ts, redirect.test.ts)
    └── jornada atravessando rota, sessão e persistência
        → E2E — bun run test:e2e  (e2e/auth/*.spec.ts)
```

Um comportamento, uma camada. Um `.test.tsx` e uma story com `play` afirmando a
mesma coisa é achado: apague a que está na camada errada pelo critério acima,
não a mais nova. Stories moram em `apps/storybook/src/stories/<camada>/`, nunca
ao lado do componente; o catálogo alcança a feature por caminho
(`@features/auth/components/forms/sign-up-form`) porque documenta o componente,
não a rota.

Escrever o arquivo é `storybook-story`; o `play` dentro dele é `storybook-test`.

---

## Passo 5 — Onde o componente mora

A escada é `@fifilo/ui` → `@fifilo/patterns` → `apps/web/src/layouts` →
`apps/web/src/features/<feature>` (Decisão 006). Esta skill só precisa da régua
para não errar de lado:

- **Shell** — o quadro que não sabe o que carrega — vai para `packages/patterns`
  na primeira utilização, sem esperar segundo consumidor.
- **Vitrine** — sabe quais campos, qual cópia, qual mutação — fica na feature e
  compõe shells; não redesenha quadro nem redeclara estado. O vocabulário de
  estado é `@fifilo/patterns/state-kinds`.
- `apps/web/src/components` é estrutura de página do app (`page.tsx`,
  `password-field.tsx`), não uma segunda biblioteca de UI.
- Nunca copiar, renomear ou embrulhar um componente neutro sem responsabilidade
  de app ou feature (router, sessão, autorização, dado, regra de apresentação).

A decisão em si é de [`design-system`](../design-system/SKILL.md), sobre
[`component-ownership.md`](../../../docs/engineering/component-ownership.md).

---

## Passo 6 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | Rota fina: `validateSearch`, `loaderDeps`, `loader`, guardas e render; importa de `@features/<feature>` | 007 |
| 2 | Search params com schema Zod em `route-search.ts`; nenhum parser manual espalhado | 007 |
| 3 | `query-options.ts` só quando loader e hooks compartilham recurso; mesmo `queryKey`/`queryFn` | 007 |
| 4 | Page em `pages/`, um tier por arquivo; nenhum `*-page` em `components/` | 007 |
| 5 | Provider só com estado de rota compartilhado real; ações semânticas | 007 |
| 6 | `components/` sem router; formulário recebe callbacks | 007 |
| 7 | Container + `*FormFields`; story monta a segunda | 007 · delivery flow |
| 8 | Hook dono de rede, navegação e toast; roteia por `code` | 007 |
| 9 | Schema do formulário estende o contrato; não redeclara invariante | 002 |
| 10 | `http/` puro, por `api.<recurso>`, `edenStatus`/`edenCreated`; nunca `'/api/...'` literal | 013 |
| 11 | Toast em `feedback.ts`; mensagem de servidor de story em `storybook/` | 007 |
| 12 | Nenhuma pasta vazia ou especulativa; grupo em `components/` só com 2+ peças | 007 |
| 13 | Feature importa outra só por módulo público deliberado | 007 |
| 14 | Server state em Query, URL em Router, form em RHF, Zustand só UI efêmera | AGENTS.md |
| 15 | Cada comportamento em uma camada: story com `play`, `bun test` ou E2E | 009 · test-plan |
| 16 | Superfície com comportamento de browser tem story com `play`; página coberta em `stories/pages/` | 009 |
| 17 | Shell em `patterns`, vitrine na feature; nenhum wrapper que só renomeia | 006 |
| 18 | `bun run typecheck`, `bun run test` e `bun run storybook:test` depois do refactor | AGENTS.md |

---

## Exemplo

Tarefa: *"a tela de cadastro precisa criar a conta e levar a pessoa ao login
com o e-mail preenchido"*. É como `features/auth` já está montado.

**Passo 2 — a rota.** `routes/(auth)/sign-up.tsx` valida `redirect` no search,
decodifica com `decodeAuthRedirect` e renderiza `SignUpPage` de
`@features/auth`. Sem `query-options.ts`: a tela não lê recurso remoto. Sem
provider: um único filho.

**Passo 3 — o formulário.** `SignUpPage` monta `SignUpForm` (container).
`useSignUpForm` chama `signUp` de `http/sign-up.ts`, roteia `conflict` para o
campo `email` com `form.setError`, emite `authFeedback.signUp.success` e navega
para `/login` com `search: { email, redirect }`. `SignUpFormFields` só lê o
form por `useFormContext` e delega `onSubmit`. `schemas/sign-up-form.ts` estende
`signUpRequestSchema` com `confirmPassword` e o remove no `transform`.

**Passo 4 — a camada de teste.** Digitar, ver a força da senha, submeter e ler o
toast dependem de DOM real → `sign-up-form.stories.tsx` monta `SignUpFormFields`
num `FormProvider` de teste e injeta o `onSubmit` por cenário (`createAccount`,
`rejectDuplicatedEmail`, `failToReachServer`) lendo as mensagens de
`auth-story-fixtures.ts`. `password-requirements` é derivação pura →
`password-requirements.test.ts`. A jornada cadastro → login → dashboard
atravessa sessão e persistência → `e2e/auth/`. `register.stories.tsx` cobre a
página.

**Passo 5 — onde mora.** `PasswordStrength` não sabe de cadastro → shell em
`@fifilo/patterns/password-strength`. `PasswordField` conhece o toggle do app →
`apps/web/src/components`. O formulário sabe os campos e a cópia → feature.

**O que as decisões evitaram:**

| Decisão | Alternativa comum | Fonte |
| --- | --- | --- |
| Rota importando `@features/auth` | rota montando o formulário e o toast ela mesma | 007 |
| Container + `SignUpFormFields` | um componente só, com `useNavigate` dentro, impossível de montar em story | 007 |
| Schema estendendo o contrato | `z.object({ email, name, password: z.string().min(12) })` reescrito no Web | 002 |
| Story com `play` para o formulário | `.test.tsx` em jsdom afirmando foco e toast | 009 |
| `http/sign-up.ts` por `api.auth['sign-up'].post` | `fetch('/api/auth/sign-up')` com o path duplicado | 013 |
| Fixtures em `storybook/` | mensagem de servidor copiada dentro de cada story | 007 |

---

## Antipadrões

| Antipadrão | Fonte |
| --- | --- |
| `*-page` dentro de `components/` | 007 |
| Rota montando shell visual ou encadeando muitos handlers por props | 007 |
| Import profundo de rota para dentro da feature, fora do `index.ts` | 007 |
| Parsing de search params replicado em vários filhos, ou parser manual com Zod disponível | 007 |
| `route-search.ts`, `query-options.ts`, `dialogs/` ou grupo criado sem conteúdo real | 007 |
| Provider criado para tela simples sem compartilhamento real de estado | 007 |
| Arquivo de page com dois exports | 007 |
| Componente compartilhado acoplado ao TanStack Router | 007 |
| Formulário sem `*FormFields`, impossível de montar em story | 007 |
| Hook de formulário sem dono da rede: o componente chama `http/` direto | 007 |
| Regra do contrato redeclarada no schema do formulário | 002 |
| `apiFetch('/api/...')` literal; `error.status` comparado sem `edenStatus` | 013 |
| Client em `api/` em vez de `http/` | AGENTS.md |
| Zustand para server state ou para duplicar o estado da URL | AGENTS.md |
| Story tratada como vitrine, sem `play` onde há interação | 009 |
| `.test.tsx` e story com `play` afirmando o mesmo comportamento | 009 · test-plan |
| Story ao lado do componente em vez de `apps/storybook/src/stories/` | 006 |
| Cópia, alias ou wrapper de componente neutro sem responsabilidade de app | 006 |
| Segunda funcionalidade crescendo dentro da feature porque lê o mesmo dado | 007 |
| Componente sem consumidor, teste ou story mantido "para depois" | 007 |

---

## Passo 7 — Fechar

1. **Passe o bastão.** A validação proporcional vai para
   [`engineering-validation`](../engineering-validation/SKILL.md):
   `bun run lint:ci`, `bun run typecheck`, `bun run test` sempre;
   `bun run storybook:test` quando componente, pattern ou story mudou;
   `bun run test:e2e` quando rota, sessão ou jornada de persistência mudou.
2. **Mudança de forma se documenta.** Se o refactor mudou o padrão da feature
   modelo, a Decisão 007 e o delivery flow mudam com ele — não se cria uma
   segunda forma calada.
3. **Lacuna de produto volta ao começo.** Cópia, estado ou regra que nenhuma
   fonte deste repositório decide: registre a questão de produto em aberto para
   o produto construído sobre este starter.

---

## Relacionados

- Decisão 007 — a fonte
- Decisão 006 · 009 · 013 · 002
- [`references/docs.md`](references/docs.md) — os arquivos de referência da feature modelo
- [`feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md) § 5 — a ordem da fatia no Web
- [`component-ownership.md`](../../../docs/engineering/component-ownership.md) — onde o componente mora
- [`test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1 — qual camada testa o quê
- [`engineering-api`](../engineering-api/SKILL.md) — o client que esta tela consome
- [`design-system`](../design-system/SKILL.md) — a skill irmã de UI: onde o componente mora
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; decisão histórica não orienta código novo
