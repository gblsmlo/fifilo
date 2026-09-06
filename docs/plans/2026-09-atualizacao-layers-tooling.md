# Plano — atualização de layers, responsabilidades, tooling, skills e docs

Referência: `studio-risine/lemind` (estado de 2026-09-06). O twincam é o
starter neutro de domínio; o lemind é o produto que cresceu em cima da mesma
base e fixou, em decisões e guias, o que funcionou e o que quebrou. Este plano
traz de volta **só o que é estrutural** — camadas, fronteiras, tooling, camada
de teste, skills e forma da documentação.

## 0. Limites

Fica de fora, por decisão do mantenedor:

- Padrão, vocabulário ou decisão de **domínio** (leads, tasks, workspace slug
  na URL, collection views, preview/single de registro, worker de tarefas
  periódicas, RBAC de produto, specs normativas `docs/specs/**`).
- **Scripts de validação de spec e congêneres**: `specs:validate`,
  `check:rbac`, `check:resolucao`, `check:e2e-await`, `check:kernel`,
  `check:api`, `check:docs`, `drizzle:check` (allowlist de SQL cru),
  `boundaries:check`. A fronteira entra por `exports` de package, por
  `tsconfig` e por texto — não por script.
- Tracker (Multica/Linear) e fluxo Product → Spec → Engineering.

Fica **e é atualizado**, por decisão do mantenedor: a estrutura de Auth nas
quatro superfícies — `apps/api`, `apps/web`, `apps/storybook` e `e2e`.

## 1. Diagnóstico — twincam hoje × referência

| Área | twincam hoje | Referência (genérico) | Gap |
| --- | --- | --- | --- |
| `apps/api` | `src/auth/*` + `src/routes/{auth,health,users}.ts`; `server.ts` compõe **e** faz `listen` | uma fatia por capacidade em `src/features/<cap>/`; `libs/` sem dono; `app.ts` (composição exercitável por `app.handle`) separado de `server.ts` (listen); `exports` com `./server` para o tipo `App` | agrupado por papel técnico; app não testável inteiro; sem superfície publicada |
| Guard de auth | `createAuthGuard` com `derive({ as: 'scoped' })` em `src/auth/middleware.ts` | guard `scoped` nomeado; derives específicos de módulo `as: 'local'`; teste de que derive não vaza para outro módulo | falta o teste de isolamento e o critério `local` × `scoped` documentado |
| Validação na borda | `safeParse` + `badRequest()` dentro do handler (`routes/auth.ts`) | schema declarado em `options.body/query/params`, nunca no handler; schema mora em `packages/core/src/contracts` | tipo perdido para Eden/OpenAPI; regra em dois lugares |
| Web → API | `fetch('/api/v1/me')` literal em `features/users/current-user.ts` | Eden Treaty sobre `import type { App }`; `apps/web/src/libs/api-client.ts` com `edenStatus` e `edenCreated`; `api-fetch.ts` cookie-aware para SSR | rota como string; sem contrato executável |
| `packages/core` | `contracts/{auth,health,users}.ts`, `errors`, `primitives`, `result`; barrel vazio | idem como **kernel**; capacidade nova ganha `src/<cap>/` com subpath próprio; Zod declara, tipo infere; id é string opaca, PK `text`, sem `.uuid()` | ok; falta registrar a regra kernel × capacidade e a regra de id |
| `packages/ui` | `index.ts` re-exporta `button`, `spinner`, `utils`; stories dentro do package; React em `dependencies` | barrel sem componente; `exports` com `./components/*.test: null`; React/primitivos em `peerDependencies`; stories centralizadas em `apps/storybook/src/stories/ui` | barrel abre atalho; stories fora do lugar; classificação de dependência |
| `packages/patterns` | não existe | composições neutras sobre `ui` (`ConfirmDialog`, `StateSurface` + `state-kinds`, `PasswordStrength`, `SettingsRow`, `Widget`); nunca importa `@features`, core ou router; subpath por composição | camada inteira ausente; Auth já precisa de `PasswordStrength` e `StateSurface` |
| `packages/observability` | `index.ts` faz `export *` de `logger`, `tracing`, `audit` | barrel exporta tipos + `context`; runtime em `./runtime` | barrel constrói Pino ao importar |
| `packages/infra/env` | `server/client/migration/spike` + `runtime.ts` | idem + factories com `RuntimeEnv` injetado; `web-server.ts` quando o Web tiver env de servidor | ok; documentar |
| `packages/infra/database` | `client/schema/schemas/users/workspace/seed` | idem + `src/tests/` (RLS p0, fallback), `rollbacks/*.sql`, `test/require-postgres.ts` | falta a forma de teste de persistência |
| `apps/web` | `features/auth` já na forma 048; `layouts/` shell; alias só `@features` | `libs/` (`api-client`, `api-fetch`); aliases `@web/*`, `@libs/*`, `@features/*`; `layouts/page`; `test/dom.ts`; `bun test --isolate --timeout 20000` | falta `libs/`, aliases, harness de DOM |
| `apps/storybook` | `@storybook/test-runner` (deprecado), globs em `packages/ui` e `apps/web`, sem `titlePrefix` | `@storybook/addon-vitest` + Vitest browser (Playwright); `stories/{overview,ui,patterns,features,layouts,pages}` com `titlePrefix`; `storySort`; `test-utils/` (a11y baseline, `story-arg-types`, `auth-story-router`, `story-query-client`); stub `api-fetch` por alias | runner deprecado; sem escada; sem utilitários de teste |
| `e2e` | não existe | `e2e/` na raiz + `playwright.config.ts`: projeto `setup` com `storageState`, `helpers/app-test.ts` (espera de hidratação), `helpers/auth.ts` (login via API), `auth/*.spec.ts`, `webServer` API+Web com `E2E_PORT_OFFSET` | camada inteira ausente |
| Root scripts | `test` roda tudo; `lint:ci` sem `--error-on-warnings` | `test:unit` × `test:integration`; `lint:ci` com `--error-on-warnings`; `test:e2e*`; `storybook:test` via vitest | sem separação por pré-requisito |
| `tsconfig.base` | `paths` para **todos** os `@twincam/*` | `paths` só para aliases do Web (`@features`, `@libs`, `@web`); packages resolvem por `exports`; `noUncheckedIndexedAccess`; `verbatimModuleSyntax` | `paths` abre o interior de todo package |
| `biome.json` | recommended + `noConsole` | + `nursery.noFloatingPromises: error`; override para `*.test.*` | promessas soltas passam |
| Husky | `sh scripts/check-toolchain.sh` | `. scripts/check-toolchain.sh` (source) que ativa Node pinado via fnm/nvm | falha em shell com Node divergente |
| CI | 1 job; sem Storybook, sem E2E | jobs `quality` / `build` / `storybook` / `e2e`; `scripts/ci-env.sh`; `concurrency`; upload de relatório em falha; `.github/workflows/README.md` | verificação fora do CI apodrece |
| `.github` | só `ci.yml` | + `pull_request_template.md`, `ISSUE_TEMPLATE/config.yml` | — |
| `.claude/` | ausente | `settings.json` com hooks (SessionStart, PreToolUse, PostToolUse, Stop) e allowlist; `launch.json`; `skills -> ../.agents/skills` | — |
| Skills | nenhuma no repo | `.agents/skills/*` com convenção fixa | — |
| Docs | `docs/architecture.md`, `docs/commit-slices.md`, `AGENTS.md` de 40 linhas | `docs/README.md` (pergunta → fonte), `docs/00-architecture-map.md` (precedência + mapa), `docs/engineering/*` por território, `docs/decisions/` com índice resolvedor, `docs/bugs/` com índice | um doc guarda tudo; nada é endereçável por número |

## 2. Camadas e responsabilidades alvo

### 2.1 Mapa de dependências

```text
apps/web       -> core (contratos), auth/client, infra-env/client, patterns, ui
               -> apps/api/server        (somente `import type { App }`)
apps/api       -> core, auth/server, infra-env/server, infra-database, observability/runtime
apps/storybook -> ui, patterns, core (fixtures), apps/web por alias (@features, @web, @libs)
e2e            -> nada do workspace; fala com Web e API por HTTP
core           -> zod e primitivos puros
auth           -> infra-database, infra-env, observability, Better Auth
infra/env      -> zod e helper de runtime
infra/database -> infra-env, observability, Drizzle/PostgreSQL
observability  -> pino
patterns       -> ui, React            (nunca @features, core, router)
ui             -> React, Base UI       (nunca core, auth, env, banco)
```

Negativas fixas: `core` não importa infra, auth, Elysia, Drizzle; `infra-database`
não importa `auth` (o seed injeta capacidade em vez de puxar o auth server);
`ui` não importa `patterns`; um package nunca depende da raiz para resolver um
import próprio.

### 2.2 `apps/api` — fatia por capacidade

```text
apps/api/src/
├── app.ts                       composição (createApp); exercitável por app.handle
├── server.ts                    listen + log de start; exporta `type App`
├── openapi.ts                   referência dev-only
├── features/
│   ├── auth/
│   │   ├── actor.ts                     resolução de sessão
│   │   ├── actor-context.ts             createAuthGuard (scoped) + derives (local)
│   │   ├── auth.routes.ts               sign-up provisionado, /me
│   │   ├── auth-handler.routes.ts       /api/auth/* -> Better Auth
│   │   ├── membership-persistence.ts
│   │   ├── provision-user.ts
│   │   ├── *.test.ts · *.integration.test.ts
│   │   └── index.ts                     superfície pública da fatia
│   ├── health/
│   └── users/
├── libs/                        http-errors, domain-error-status, wire-format, entity-id
└── test/require-postgres.ts
```

Regras: rota fina (schema em `options`, contexto, caso de uso, mapeia
`Result` → HTTP); fatia importa fatia **pelo barrel**; `routes/` e
`persistence/` não existem como pastas de topo; `package.json` publica só
`./server` (e fatias que outro app precise).

### 2.3 `packages/core` — kernel e capacidades

- `src/contracts/` é o kernel: contratos que **mais de uma** capacidade ou
  app consome, `result`, `errors`, `primitives`.
- Capacidade nova: `src/<cap>/{index,schemas,contracts}.ts` com subpath
  próprio em `exports`.
- Zod declara na borda (HTTP, row, import); tipo infere (`z.infer`); variante
  deriva (`.pick/.partial/.extend`). Dentro do processo (ports, commands),
  TypeScript puro.
- `EntityId` garante procedência, não formato: PK `text` gerada pela aplicação,
  nenhum schema com `.uuid()`, gerador em **um** ponto.

### 2.4 UI — escada de ownership

| Camada | Responsabilidade | Teste | Story |
| --- | --- | --- | --- |
| `packages/ui/src/components` | primitivo visual neutro | `bun test` para lógica | `stories/ui` |
| `packages/patterns/src` | composição neutra com contrato estável; shell que não sabe o que carrega | `bun test` para lógica | `stories/patterns` |
| `apps/web/src/layouts` | shell global acoplado a router/sessão/nav | `bun test` | `stories/layouts` |
| `apps/web/src/components` | estrutura de página exclusiva do app; **não** é segunda lib | — | — |
| `apps/web/src/features/<f>` | vitrine: vocabulário, dado, mutação, permissão | `bun test` | `stories/features` |

Regras: camada decidida por responsabilidade, não por contagem de consumidores;
consumo só por export publicado; wrapper sem responsabilidade nova é cópia
disfarçada; estado de superfície (`loading/empty/error/permission/ready`) tem
um vocabulário só, em `patterns/state-kinds`; story é obrigação de tudo que
`packages/*` publica.

Versões compartilhadas por `ui` e `patterns` (`react`, `react-dom`,
`@base-ui/react`, `class-variance-authority`, `lucide-react`) vão para
`workspaces.catalog` na raiz. Cada consumidor Tailwind v4 que escaneia
`packages/ui/src` via `@source` precisa da mesma linha para `packages/patterns/src`.

### 2.5 `apps/web` — forma da feature e estado

Feature (Auth já segue; vira a **feature modelo** do starter):

```text
index.ts · route-search.ts · query-options.ts · <domínio>.ts
http/ · hooks/ · pages/ · components/{forms,dialogs,…}/ · schemas/ · utils/ · storybook/
```

- Rotas em `(auth)/route.tsx` e `(authenticated)/route.tsx`; nunca `_`,
  `layout.tsx`, `page.tsx`.
- Estado: servidor em TanStack Query; formulário em React Hook Form; URL em
  TanStack Router; Zustand só para UI efêmera.
- `libs/api-client.ts` (Eden) e `libs/api-fetch.ts` (cookie-aware, base
  resolvida por chamada). Adapters HTTP chamam-se `http/`, não `api/`.
- Aliases `@features/*`, `@libs/*`, `@web/*` declarados em `tsconfig.base.json`,
  `vite.config.ts`, `.storybook/main.ts` e `vitest.config.ts` — a duplicação é
  aceita e vigiada.

### 2.6 Auth — o que muda em cada superfície

| Superfície | Permanece | Atualiza |
| --- | --- | --- |
| `packages/auth` | `client/server/organization`, barrel vazio | `profile.ts` se o starter expuser edição de perfil; senão nada |
| `apps/api` | actor, guard, provision, handler Better Auth | move para `features/auth/`; guard `scoped` + derives `local` + teste de não-vazamento; schemas em `options`; `auth.routes.test.ts` + `auth-session.integration.test.ts` |
| `apps/web` | `features/auth` inteira, `route-guard.ts`, `(auth)` e `(authenticated)` | + `http/sign-out.ts`, `feedback.ts`, `password-requirements.ts`, `storybook/auth-story-fixtures.ts`; `users/current-user.ts` via Eden; formulários consomem `patterns/password-strength` |
| `apps/storybook` | — | `stories/features/auth/components/forms/*.stories.tsx` com `play`; `test-utils/auth-story-{router,layout,surface}.tsx` |
| `e2e` | — | `auth.setup.ts` + `helpers/auth.ts` (login via `/api/auth/sign-in/email`, `storageState`); `auth/password-sign-in.spec.ts`, `auth/password-recovery.spec.ts` (só o trecho sem entrega de e-mail), `auth/organization-onboarding.spec.ts` |

### 2.7 Camada de teste — um comportamento, uma camada

| O comportamento depende de | Camada | Runner |
| --- | --- | --- |
| layout, foco real, portal, pointer, a11y, interação | story com `play` | `bun run storybook:test` |
| lógica, derivação, formatação, branch sem DOM real | `bun test` | `bun run test` |
| jornada por rotas, sessão, persistência | E2E | `bun run test:e2e` |

Critério: **o que o jsdom não tem**. Storybook é camada de teste, não catálogo;
a ordem Atomic (`Overview, UI, Patterns, Features, Layout, Pages`) é
consequência. `.test.tsx` e `play` afirmando a mesma coisa é achado. Teste
colocado ao lado do código; `src/test/` é infra, nunca árvore espelho.
Integração (`*.integration.test.*`) separada de unidade para uma máquina sem
Docker ficar verde; `requirePostgres()` nomeia o pré-requisito. Cobertura não
é medida (registrar o porquê).

## 3. Tooling

### 3.1 Raiz

- `package.json`: `workspaces: { packages: [...], catalog: {...} }`; scripts
  `test:unit`, `test:integration`, `test:e2e`, `test:e2e:install`,
  `test:e2e:ui`, `storybook:test` (vitest), `lint:ci` com
  `biome ci --error-on-warnings .`, `typecheck` filtrando `@twincam/*`.
- `tsconfig.base.json`: remover `paths` de `@twincam/*`; manter `@features/*`,
  `@libs/*`, `@web/*`; adicionar `noUncheckedIndexedAccess` e
  `verbatimModuleSyntax` (necessário para o `import type { App }` ser apagado).
- `biome.json`: `nursery.noFloatingPromises: error`; override de teste.
- `.gitignore`: `/e2e/.auth/`, `/playwright-report/`, `/test-results/`,
  `.claude/settings.local.json`.

### 3.2 Hooks e toolchain

- `scripts/check-toolchain.sh`: resolver raiz por `git rev-parse
  --show-toplevel` (o script passa a ser *sourced*); ativar Node pinado via
  `fnm`/`nvm` quando o shell resolve outra versão; falhar só quando nenhum
  gerenciador tem a versão.
- `.husky/pre-commit`: `. scripts/check-toolchain.sh` → `lint:staged` →
  `git update-index --again`. `pre-push`: toolchain → `lint:ci` → `typecheck`.
  `commit-msg`: toolchain → `commitlint`.

### 3.3 CI

- `quality` (Postgres 17 como service): toolchain → install frozen → `lint:ci`
  → `typecheck` → `sh scripts/ci-env.sh` → `db:migrate` → `test` →
  `test:db:rls:p0`.
- `build` (depende de `quality`): `bun run build`.
- `storybook` (depende de `quality`): `bunx playwright install --with-deps
  chromium chromium-headless-shell` **a partir de `apps/storybook`** →
  `storybook:test`.
- `e2e` (depende de `quality`, Postgres): `ci-env` → migrate → seed →
  `test:e2e:install` → `test:e2e` → upload de `playwright-report` e
  `test-results/e2e` em falha.
- `concurrency` por ref; `permissions: contents: read`;
  `.github/workflows/README.md` guarda as decisões não óbvias do YAML.
- `.github/pull_request_template.md` (sem seções de tracker) e
  `ISSUE_TEMPLATE/config.yml`.

### 3.4 Docker e Compose

Já conformes: Dockerfile copia todos os workspaces antes do
`bun install --frozen-lockfile`; Compose com volume nomeado em
`/app/node_modules`. Registrar as duas regras em `docs/engineering/toolchain.md`
e o portão de PR para mudança de Docker/fronteira de runtime (`build`,
`docker compose config --quiet`, `docker compose build`, smoke de barrels sem
efeito colateral).

### 3.5 Claude Code e editor

- `.claude/settings.json`: `SessionStart` → `toolchain-guard.sh`;
  `PreToolUse(Bash)` → `deny-foreign-pm.sh`; `PostToolUse(Edit|Write)` →
  `format-edit.sh`; `Stop` → `verify-gate.sh` rodando `git diff --check` e
  `lint:ci` (sem specs, sem boundaries); allowlist de comandos de validação.
- `.claude/launch.json`: `api` 3001, `web` 3000, `storybook` 6006.
- `.claude/skills -> ../.agents/skills` (symlink).
- `.zed/settings.json`: Biome via `node_modules/.bin/biome lsp-proxy`.

## 4. Skills (`.agents/skills/`)

Convenção comum: `name:` igual à pasta; corpo ≤ 500 linhas; frontmatter
`fonte:` cita `Decisão NNN` (nunca caminho de arquivo numerado); seção
"Quando NÃO usar" com tabela de roteamento; skills de tecnologia globais
(`react-developer`, `elysia-build`, `drizzle-review`, `tanstack-query`,
`bun-test-build`, `playwright-build`, `storybook-story`, `http-contract`,
`teste-design`) citadas **pelo nome, sem link**; fecha com "Relacionados" →
índice de decisões.

| Skill | Ação | O que remover ao portar |
| --- | --- | --- |
| `auth` | portar como está | `scope`/`author` |
| `engineering-contract` | portar | `sla`/`leads` como exemplo → usar `auth`/`users`; specs; Multica |
| `engineering-persistence` | portar | BUG-038, `p0-rls` paths do lemind, `drizzle:check`; multi-tenant fica (organizations é do starter) |
| `engineering-api` | portar | incidente `/api/me`, `sla.routes.ts`; manter `local` × `scoped` |
| `engineering-web` | portar | `references/docs.md` apontando para `leads` → apontar para `features/auth` |
| `engineering-validation` | portar | nomes de scripts de spec; manter toolchain → focado → repo |
| `engineering-review` | portar | `commercial-pipeline`, `PIPE-*`, identificadores de domínio |
| `engineering-refactor` | portar | auditoria de Tasks, `TASKS_SUBDOMAIN_ISOLATED`, `boundaries:*` |
| `design-system` | portar | `@lemind/*`, tabela de legado `Details*`, exemplo Campanhas |
| `interface` | **não** portar | produto (pt-BR, advogado, Preview/Single) |
| `engineering-backlog/-delivery/-planning`, `product-*` | **não** portar | tracker e organização Product |
| `coss`, `coss-particles` | opcional via `skills-lock.json` | — |

Toda citação `Decisão NNN` é renumerada para o índice do twincam (§5).

## 5. Docs

Estrutura alvo:

```text
docs/
├── README.md                      pergunta → fonte
├── 00-architecture-map.md         precedência, mapa de responsabilidades, fluxos canônicos
├── engineering/
│   ├── architecture.md            stack, organizations, identificador na borda, baseline de segurança
│   ├── component-ownership.md
│   ├── environment.md
│   ├── observability.md
│   ├── toolchain.md
│   ├── testing.md · test-plan.md
│   ├── packages-implementation-guide.md
│   ├── api-implementation-guide.md
│   ├── feature-delivery-flow.md   (absorve docs/commit-slices.md)
│   ├── drizzle-first-persistence.md
│   ├── security.md · operation.md (só o transversal: classificação, retenção, outbox, expand/contract)
├── decisions/README.md            número → arquivo → estado (vigente · refinada · histórica)
├── decisions/NNN-*.md
├── bugs/README.md                 evidência reproduzível; não é backlog
└── plans/                         este arquivo e os próximos
```

Regras: **um documento guarda o que só ele guarda** (aponta, não repete);
cita-se `Decisão NNN` e linka-se o índice; schema é lido do código
(`packages/infra/database/src/schema.ts`), nunca de dicionário em prosa;
decisão substituída vai para `decisions/archive/` quando o sucessor existe.
`docs/architecture.md` atual é redistribuído e removido.

Decisões a registrar (renumeradas, texto genérico, exemplo em Auth/Users):

| # | Assunto | Origem lemind |
| --- | --- | --- |
| 001 | fronteiras de package e ownership de dependência | 014 |
| 002 | fluxo de dados e onde cada camada valida | 003 + 023 |
| 003 | composição de adapters de persistência (`repository.ts` como composition root) | 004 |
| 004 | Drizzle-first; SQL cru como exceção justificada | 011 |
| 005 | escopo de plugin Elysia: guard `scoped`, derive `local` | 015 |
| 006 | ownership de componente: `ui → patterns → layouts → features`; shell × vitrine | 018 + 029 + 032 |
| 007 | estrutura modelo de feature em Web | 048 |
| 008 | um runner por camada de teste | 027 |
| 009 | Storybook é camada de teste, não catálogo | 072 |
| 010 | escada Atomic ordena o catálogo (`titlePrefix` + `storySort`) | 028 |
| 011 | controles por `argTypes`, descrição só em JSDoc | 031 |
| 012 | contrato declara em Zod, tipo infere; kernel × capacidade | 073 |
| 013 | Web consome API pelo contrato executável (Eden); `edenStatus`/`edenCreated` | 074 + 075 |
| 014 | id é string opaca; gerador em um ponto | 076 |
| 015 | docs endereçadas por índice; arquivo de decisão substituída | 071 |
| 016 | fluxo proporcional: sem parent por convenção (só o portão de decomposição) | 026 |

`AGENTS.md` reescrito no formato do lemind (toolchain, validação, onde
começar, regras que nenhum portão pega, delivery), sem tracker e sem specs;
`CLAUDE.md` idêntico ou symlink.

## 6. Sequência de entrega

Cada fatia é um commit revisável e deixa o starter utilizável. Dependências
indicadas entre parênteses.

1. **`chore(tooling): toolchain, biome, tsconfig, hooks`** — §3.1, §3.2.
   Remove `paths` de `@twincam/*`; adiciona `catalog`, `noFloatingPromises`,
   `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `check-toolchain.sh`
   sourced com fnm/nvm. Verificação: `lint:ci`, `typecheck`, `build`.
2. **`refactor(api): fatia por capacidade e composição exercitável`** (1) —
   §2.2, §2.6. `app.ts`/`server.ts`; `features/{auth,health,users}`; `libs/`;
   schemas em `options`; guard + derives + teste de não-vazamento; `exports`
   `./server`. Verificação: `apps/api` tests, `app.handle` sobre o app inteiro.
3. **`refactor(packages): barrels, exports e observability/runtime`** (1) —
   `ui/src/index.ts` sem componentes, `./components/*.test: null`, React em
   peer; `observability` com `./runtime`; env factories com `RuntimeEnv`.
   Verificação: smoke de import dos barrels sem efeito colateral.
4. **`feat(patterns): package de composições neutras`** (3) —
   `state-kinds`, `state-surface`, `confirm-dialog`, `password-strength`,
   `settings`. `@source` no Web e no Storybook. Verificação: `bun test` no
   package, `typecheck`.
5. **`feat(web): libs/api-client via Eden e aliases`** (2, 4) — `libs/`,
   `current-user.ts` migrado, `@web/*` e `@libs/*`, `http/sign-out.ts`,
   `feedback.ts`, `password-requirements.ts`, formulários sobre
   `patterns/password-strength`, `test/dom.ts`, `--isolate --timeout 20000`.
6. **`feat(storybook): addon-vitest, escada e test-utils`** (4, 5) — remove
   `@storybook/test-runner`; `vitest.config.ts` browser; `stories/{…}` com
   `titlePrefix` e `storySort`; move stories de `packages/ui` para
   `stories/ui`; `test-utils/`; stories de Auth com `play`; stub `api-fetch`.
   Verificação: `storybook:test` local.
7. **`feat(e2e): runner Playwright com auth por setup`** (5) — `e2e/`,
   `playwright.config.ts`, `auth.setup.ts`, `helpers/{app-test,auth}.ts`,
   `auth/*.spec.ts`, `e2e/README.md`. Verificação: `test:e2e` local com seed.
8. **`ci: jobs quality/build/storybook/e2e`** (6, 7) — §3.3, `ci-env.sh`,
   templates de PR e issue, `workflows/README.md`.
9. **`chore(claude): settings, hooks, launch, skills symlink`** (1) — §3.5.
10. **`docs: mapa, engineering por território, índices de decisões e bugs`**
    (todas) — §5; decisões 001–016; `docs/architecture.md` e
    `docs/commit-slices.md` redistribuídos; `AGENTS.md`/`CLAUDE.md`.
11. **`docs(skills): skills de engenharia neutras`** (10) — §4, citando o
    índice novo.

## 7. Gatilhos para revisitar

- Segundo app consumindo o mesmo shell de página → `Single`/`Page` viram
  candidatos a `patterns`.
- Primeira tabela de negócio → `rollbacks/`, `test:db:rls:p0` e teste negativo
  com dois tenants ganham conteúdo real.
- Segundo consumidor da API que não seja TypeScript → OpenAPI volta à mesa.
- Ciclo entre packages ou regra condicional por export → reavaliar
  enforcement por script (hoje fora de escopo por decisão).
- `packages/utils` só nasce quando houver dois helpers puros sem dono;
  `apps/worker` só quando houver tarefa periódica de verdade.
- Segundo consumidor TypeScript da API (segundo app, CLI, helper de E2E
  tipado) → `apps/web/src/libs/api-client.ts` vira `packages/api-client`:
  `createApiClient({ fetcher })` devolvendo `treaty<App>(...).api`, mais
  `edenStatus`/`edenCreated`; `fetcher` injetado, `api-fetch.ts` continua no
  Web (acoplado ao request SSR do TanStack Start); a aresta
  `packages/api-client → apps/api` é `import type` e entra na decisão 013.
  Até lá, um consumidor só não justifica package.
