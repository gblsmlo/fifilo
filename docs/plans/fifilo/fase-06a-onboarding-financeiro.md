# Fase 06a — Onboarding financeiro

**Marco 1** · Depende de: [Fase 01](fase-01-contas-carteiras-e-saldo.md) e
[Fase 06](fase-06-settings-e-aceitacao.md) · Entrega: o dono que acabou de
criar o workspace é conduzido até ter moeda, fuso e a primeira conta, em vez de
cair num app vazio.

## Por que esta fase tem sufixo

O Marco 1 foi declarado fechado pela auditoria de aceitação da Fase 06
(`c7b4133`). Esta capacidade nasceu depois disso, já com a Fase 07 em execução,
e é Marco 1 pelo conteúdo: é núcleo financeiro, não inteligência. O sufixo
registra os dois fatos ao mesmo tempo — pertence ao Marco 1, entregue fora da
ordem. Renumerar a sequência 07–12 para abrir espaço falsificaria o histórico
de entrega que os registros de sessão de cada fase preservam.

## Objetivo

A base herdada já criava a organização no primeiro acesso. O que faltava: a
organização recém-criada não tem moeda decidida, não tem fuso decidido e não
tem conta. Toda projeção do Marco 1 lê esses três, e sem eles o dashboard
mostra zero sobre nada. O onboarding financeiro fecha essa lacuna antes da
primeira leitura.

## Escopo

### Entra

- Elegibilidade por `(organization_id, user_id)` — o dono que criou, não o
  workspace inteiro.
- Estado do onboarding derivado do que já existe: settings salvas e primeira
  conta criada. Nenhum passo é marcado à mão.
- Adiamento explícito (`dismissed_at`), com lembrete persistente enquanto o
  setup estiver incompleto.
- Grupo de rotas `(onboarding)` com shell próprio, recebendo criação de
  organização, setup e aceitação de convite.

### Não entra

Convite e papel, que são base e [Fase 04](fase-04-workspace-compartilhado.md).
Qualquer passo novo de setup além de settings e primeira conta — a régua de
completude é derivada, e cada passo novo é uma decisão nova.

## Modelagem — `packages/core`

`packages/core/src/onboarding`:

- `getFinancialOnboardingStatus` recebe `settingsConfigured` e `accountCreated`
  como fatos já apurados e devolve `FinancialOnboardingStatus`. `complete` é
  derivado dos dois; `reminderVisible` é `elegível && !completo && adiado`.
- `dismissFinancialOnboarding` recusa `insufficient_role` para quem não é dono
  e `ineligible` quando não existe linha de progresso — os dois como
  `forbiddenError` tipado, nunca exceção.
- `requireFinancialOnboardingAccess` entra em `access-control.ts` junto dos
  predicados que a Fase 04 e a Fase 06 já instalaram.

O contrato é `financialOnboardingStatusSchema` em
`packages/core/src/contracts/onboarding.ts`. A rota declara, o tipo infere
(Decision 012).

## Persistência — `packages/infra/database`

`financial_onboarding_progress`, migração `0008`:

- Chave primária `(organization_id, user_id)`.
- RLS `ENABLE` + `FORCE`, e a policy escopa por **duas** variáveis:
  `app.workspace_id` e `app.user_id`. É o ponto em que esta tabela difere de
  toda outra tabela de tenant do repositório — o progresso é do ator, não do
  workspace, e a policy precisa dizer isso.
- `dismissed_at timestamptz null` é o único estado escrito. Os passos não são
  persistidos; são lidos das tabelas que já os provam.

## API — `apps/api`

`apps/api/src/features/onboarding`, prefixo `/api/onboarding`:

- `GET /` compõe `getWorkspaceSettings` e o lookup de contas antes de chamar o
  caso de uso, e declara `financialOnboardingStatusSchema` em `response.200`.
- `POST /dismiss` mapeia o `Result` para HTTP pelo adaptador, sem `safeParse`
  no handler (Decision 002).

## Web — `apps/web`

- `features/onboarding` com `http/`, `query-options.ts`, `components/`
  (`workspace-settings-setup`, `setup-reminder`, `onboarding-completion`) e
  `pages/financial-onboarding-page.tsx`, na forma da Decision 007.
- Grupo `(onboarding)/route.tsx` com `OnboardingLayout` em
  `apps/web/src/layouts`, recebendo o nome da aplicação por prop e lido só pela
  rota. `accept-invitation.tsx` e `onboarding.tsx` saem de `(authenticated)` e
  entram aqui.
- O passo corrente é resolvido do status, não de parâmetro de URL: recarregar a
  página retoma onde parou.

## Decisões registradas

| # | Decisão |
| ---: | --- |
| 034 | [o onboarding financeiro pertence ao dono que criou o workspace](../../decisions/README.md) |
| 035 | [o onboarding usa layout dedicado](../../decisions/README.md) |

## Riscos

- **Policy com duas variáveis de sessão.** `app.user_id` é novo no contexto de
  workspace. Se algum caminho aplicar só `app.workspace_id`, a leitura devolve
  zero linhas e o dono elegível aparece como inelegível — falha silenciosa, não
  erro. A prova 1 da suíte negativa é o que pega.
- **Completude derivada.** `settingsConfigured` depende de
  `settings.updatedAt !== null`. Uma escrita de settings por outro caminho que
  não toque `updatedAt` marca o passo como pendente para sempre.
- **Rota movida.** `accept-invitation` mudou de grupo. Link antigo, bookmark e
  o próprio e-mail de convite apontam para o caminho anterior.

## Critério de conclusão

- [x] Casos de uso com teste de elegibilidade, papel insuficiente, ausência de
      linha de progresso e derivação de `complete` —
      `packages/core/src/onboarding/onboarding.test.ts`, 7 casos.
- [x] Cinco provas negativas de RLS em `financial_onboarding_progress` —
      `apps/api/src/features/onboarding/onboarding-persistence.integration.test.ts`:
      leitura escopada ao ator, escrita escopada, `WITH CHECK` cross-tenant,
      ausência de contexto e rollback.
- [x] Teste de rota para os dois endpoints —
      `apps/api/src/features/onboarding/onboarding.routes.test.ts`, 5 casos.
- [x] Story dos quatro estados — `Onboarding/FinancialSetup`:
      `WorkspaceSettings`, `FirstAccount`, `Completion`, `SkippedReminder`; e
      `OnboardingLayout` com story própria.
- [x] E2E: primeiro acesso cai no onboarding, conclui setup e chega ao
      dashboard, e o adiamento persiste e retoma no passo pendente —
      `e2e/auth/organization-onboarding.spec.ts`, 3 jornadas.
- [x] Decisões 034 e 035 registradas e indexadas.
- [x] Commitada em `db0425a`, numa fatia só em vez das cinco planejadas, e os
      gates (`lint:ci`, `typecheck`, `test`, `storybook:test`, `test:e2e`)
      rodaram contra uma árvore limpa que a contém em `60bf185`.

## Fatias de commit

1. `feat(core): add financial onboarding status and dismissal`
2. `feat(database): persist financial onboarding progress with an actor-scoped policy`
3. `feat(api): expose the financial onboarding endpoints`
4. `feat(web): add the onboarding route group and its dedicated layout`
5. `docs: record decisions 034-035`

## Registro de sessões

### 2026-09-20 — fase reconstruída a partir da árvore de trabalho

Esta fase foi escrita **depois** da implementação, não antes: o trabalho chegou
sem arquivo de plano. O conteúdo acima é o que a árvore de trabalho e as
Decisões 034 e 035 provam, não uma intenção anterior. O único item aberto do
critério de conclusão é a própria entrega — código não commitado e gates não
executados.

### 2026-09-21 — fase fechada na entrega da 06b

O último item do critério ficou aberto por um mal-entendido de registro, não
por trabalho faltando: a entrega foi commitada em `db0425a`, como uma fatia só
em vez das cinco planejadas, e nem este arquivo nem o quadro foram atualizados.
O quadro chegou a afirmar as cinco fatias entregues e, uma linha acima, que
nenhuma tinha sido commitada.

Os gates rodaram contra uma árvore limpa que contém esta fase durante a entrega
da [Fase 06b](fase-06b-ativacao-do-onboarding.md), em `60bf185`. `test:e2e`
passou com um worker; com dois, `BUG-004`.
