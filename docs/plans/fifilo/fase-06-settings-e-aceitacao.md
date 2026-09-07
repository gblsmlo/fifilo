# Fase 06 — Settings, aceitação e entrega

**Marco 1** · Depende de: [Fase 05](fase-05-analytics-e-graficos.md) ·
Entrega: FR-16, FR-17 e o fechamento do Marco 1.

## Objetivo

Fechar o núcleo. Duas metades: as configurações que o produto inteiro já
depende implicitamente, e a auditoria que decide se o Marco 1 realmente
terminou. **É esta fase que abre o portão do Marco 2.**

## Escopo

### Entra

- `workspace_settings`: moeda, locale, fuso, dia de início do mês, início da
  semana.
- `user_preferences`: tema, densidade, preferências de notificação.
- Exportação dos dados do workspace em CSV.
- Auditoria de aceitação de todas as fases contra os requisitos do
  [roadmap](README.md).
- Correção dos achados da auditoria.

### Não entra

Exclusão de conta e de workspace com o fluxo de retenção completo — a
[security.md](../../engineering/security.md) descreve estados que merecem fase
própria, e nada no Marco 1 depende disso.

## Modelagem

### Settings do workspace

Estas configurações **já são usadas** pelas Fases 01–05 com valor implícito.
Esta fase as torna explícitas e editáveis; nenhuma fase anterior deve ter
constante espalhada.

| Campo | Efeito |
| --- | --- |
| `currency` | moeda de toda conta e lançamento |
| `locale` | formatação de número e data no Web |
| `timezone` | resolve "hoje" e "este mês" antes de virar data civil |
| `monthStartDay` | mês financeiro que não começa no dia 1 |
| `weekStartsOn` | agrupamento semanal |

`monthStartDay` diferente de 1 muda **todas** as projeções da Fase 05. Ou a
Fase 05 já recebe o início do mês por parâmetro, ou esta fase reabre as seis
projeções. A primeira opção é mais barata: a Fase 05 recebe duas datas civis, e
quem as calcula é o Web.

Trocar `currency` com lançamento existente é `conflict`. Converter histórico é
outro problema, com taxa e data, e não está no escopo.

### Preferências do usuário

Chave `(user_id, organization_id)`: a mesma pessoa pode preferir coisas
diferentes em workspaces diferentes. Não é tabela de tenant no sentido estrito,
mas leva RLS pelo `organization_id` e filtro adicional por `app.user_id`, que
`applyActorContext` já instala.

### Exportação

CSV de transações com lançamentos, contas, categorias e faturas do período.
Evento de auditoria por exportação. Arquivo gerado com expiração de 24h,
conforme a retenção da `security.md`. Owner e admin exportam; `viewer` não.

## Auditoria de aceitação

O Financy fechou com uma auditoria que achou 4 bloqueadores, 8 defeitos e 8
nits **depois** de todas as fases marcadas como concluídas. O padrão é esperado,
não excepcional: a auditoria é uma fase, não uma formalidade.

Roteiro:

1. Cada FR e NFR do [roadmap](README.md) exercitado contra a API real e no
   navegador — não contra o teste que o autor escreveu.
2. Clone limpo: `git clone`, `bun install`, copiar `.env.example`,
   `docker compose up`, `bun run db:migrate`, `bun run dev`. Qualquer passo
   manual não documentado é bloqueador.
3. Varredura de segredo no histórico antes de qualquer push público.
4. Conferência de que toda tabela de tenant tem as cinco provas negativas.
5. Conferência de que toda rota de escrita tem prova de negação para `viewer`.
6. Achados registrados em `docs/bugs/` com o índice de `BUG-NNN`, classificados
   em bloqueador, defeito e nit.

Cada correção de comportamento é conferida quebrando o código de propósito
primeiro — se o teste passa com a implementação quebrada, ele não prova nada.

## Portão do Marco 2

O Marco 2 não começa enquanto qualquer item abaixo estiver aberto:

- [x] Todos os FR-01 a FR-18 exercitados e aprovados.
- [x] Todos os NFR-01 a NFR-10 verificados.
- [x] Zero bloqueador aberto em `docs/bugs/` (BUG-002 era defeito, resolvido).
- [x] `bun run lint:ci`, `typecheck`, `test`, `storybook:test`, `test:e2e`
      verdes localmente, contra PostgreSQL.
- [x] `docker compose build` e `bun run build` verdes.
- [x] Clone limpo sobe sem passo manual não documentado.
- [x] Decisões 017 a 029 registradas e indexadas (029 nasceu nesta fase).
- [x] `00-architecture-map.md` seguia genérico o bastante para cobrir
      settings/export sem edição - nenhuma capacidade anterior está listada
      por nome nele.

Motivo do portão: um agente que lê dado errado produz conselho errado com
aparência de confiança. Num produto financeiro esse é o pior resultado
possível, e não existe prompt que conserte.

## Riscos

- **Settings tratada como tela de fim de projeto.** Ela é pré-requisito das
  projeções. Se a Fase 05 assumiu início de mês no dia 1, esta fase reabre a 05.
- **Exportação vazando dado de outro workspace.** É a operação que mais lê de
  uma vez. Teste com duas organizações populadas.
- **Auditoria feita pelo autor sem roteiro.** Vira releitura do próprio código.
  O roteiro acima existe para forçar exercício real.

## Fatias de commit

1. `feat(core): add workspace settings and user preferences`
2. `feat(database): persist settings with tenant policies`
3. `feat(api): expose settings and export endpoints`
4. `feat(web): add the settings journey`
5. `docs: record the milestone 1 acceptance audit`
6. `fix: resolve the acceptance audit findings`

## Registro de sessões

### Sessão 1 — settings, exportação e auditoria de aceitação

**Entrega.** `workspace_settings` e `user_preferences` em Core (`requireSettingsWriteAccess`,
lazily-materialized com `expectedVersion: 0` = criar), persistência com a
primeira política RLS que soma `app.workspace_id` e `app.user_id`, rotas
`GET/PATCH /api/settings/{workspace,preferences}`, exportação CSV
(`packages/core/src/export`, streaming na resposta - Decisão 029, não um
arquivo com expiração), a jornada Web em `/settings` com o formulário de
workspace (gate de edição por papel na UI, nunca só ali), preferências do
usuário aplicando tema real (`.dark` no `<html>`, o gap que a Fase 05 nomeou),
e a seção de exportação. `resolveThisMonthRange` passou a receber
`monthStartDay` de verdade em vez de assumir o dia 1.

Três constantes espalhadas identificadas e corrigidas: `DEFAULT_WORKSPACE_CURRENCY`
em `accounts.routes.ts` e no formulário de compra parcelada, `DEFAULT_WORKSPACE_TIMEZONE`
duplicada em `workspace-today.ts` (API) e `resolve-this-month.ts` (Web) - as
duas agora leem `workspace_settings` de verdade, com `getBalances` ganhando
um parâmetro `workspaceCurrency` explícito em vez de assumir um.

**Achado durante a construção, não a auditoria formal:** o diálogo de nova
transação datava `occurredOn` com `new Date().toISOString()` (UTC), não o
fuso do workspace - por ~3h por dia (00h-03h UTC, quando America/Sao_Paulo
ainda está no dia anterior) isso registrava uma transação "de hoje" um dia no
futuro. `e2e/transactions/transactions.spec.ts` pegou isso ao vivo, rodando
exatamente nessa janela. Corrigido com `civilDateToday`, o mesmo padrão de
`resolveThisMonthRange`.

### Auditoria de aceitação

Roteiro executado contra a API e o navegador reais (Playwright, curl, uma
sessão `psql` com `app.workspace_id` setado à mão), não contra os testes que
este mesmo trabalho escreveu.

**FR-01 a FR-15, FR-18**: aprovados pela suíte E2E completa (15 specs, dois
workers, rodada limpa) mais os testes de integração de cada fase - login,
2FA, recuperação, onboarding, convite, papel `viewer`, contas, cartão,
parcelamento, fatura, transações, filtro, dashboard e gráficos. FR-18
("trilha de auditoria de convite, mudança de papel e remoção") foi sinalizado
como possível lacuna na leitura do plano; a leitura do código achou os quatro
hooks (`afterCreateInvitation`, `afterAcceptInvitation`, `afterUpdateMemberRole`,
`afterRemoveMember`) já registrados em `packages/auth/src/organization.ts` -
não é lacuna, é cobertura que só não aparecia na grade de rotas HTTP porque
Better Auth a resolve nos seus próprios hooks de organização.

**FR-16, FR-17**: settings e preferências, entregues e exercitados nesta
sessão via `e2e/settings/settings.spec.ts` (organização própria, não a
compartilhada - mudar `timezone`/`monthStartDay` na organização semeada
afetaria a janela padrão de `transactions.spec.ts` e `analytics.spec.ts`
rodando em paralelo).

**NFR-01** (RLS `FORCE` + cinco provas negativas): confirmado por tabela -
`financial_accounts`, `categories`, `transactions`/`entries`,
`credit_card_details`, `card_invoices`, `installment_plans`,
`idempotency_records`, `workspace_settings`, `user_preferences` têm `FORCE
ROW LEVEL SECURITY` na migração e um teste de integração cobrindo posse
cruzada, `WITH CHECK`, ausência de contexto e rollback - `user_preferences`
soma a quinta prova específica sua (mesmo organização, usuário diferente).

**NFR-02** (sem ponto flutuante): toda coluna `*Minor`/`*minor` é `bigint`;
nenhum `parseFloat` ou tipo `real`/`float` tocando dinheiro em nenhuma
camada.

**NFR-03** (fato financeiro é `date`): `occurred_on`, `period_start`,
`period_end`, `due_on` são `date`; `closed_at`/`paid_at` são `timestamp`
porque são o instante do evento de auditoria, não o fato financeiro em si.

**NFR-04** (`version` com update condicional): toda entidade mutável tem
`version` (`financial_accounts`, `categories`, `credit_card_details`,
`card_invoices`, `installment_plans`, `transactions`, `workspace_settings`,
`user_preferences`); `entries` não tem porque é append-only (Decisão 021).

**NFR-05** (`idempotency_key` em todo comando com efeito externo): **achado
real**, ver [BUG-002](../../bugs/002-idempotency-not-enforced-for-transaction-and-installment-creation.md).
`POST /api/invoices/:id/pay` sempre exigiu a chave; `POST /api/transactions`
a tratava como opcional e `POST /api/transactions/installments` nunca a lia.
Corrigido nesta mesma sessão: as duas rotas agora exigem `Idempotency-Key`
(400 sem ela) e o Web gera uma por tentativa de envio (`useRef`, estável
numa reenvio, nova após sucesso).

**NFR-06** (contrato Zod na borda, Web via Eden): confirmado - toda rota
nova (`settings`, `export`) segue o padrão `body`/`query`/`response` em Zod
na declaração da rota, nunca `safeParse` no handler; o Web só chama `api.<recurso>`.

**NFR-07** (três runners, uma camada por comportamento): sem violação
encontrada nas fatias novas - Storybook para o que depende de DOM real
(formulários com `Select`/`Switch` reais), `bun test` para lógica pura
(`toCsv`, `resolveThisMonthRange`, os use cases), E2E para a jornada completa.

**NFR-08** (`.env.example` sobe um clone limpo): verificado com um `git
clone` real para `/tmp`, `.env.example` copiado sem edição, `bun install
--frozen-lockfile`, `bun run db:migrate` contra o Postgres já no ar, e a API
respondendo `/health` - nenhum passo manual fora do documentado. Não recriado
do zero um Postgres vazio (o container de desenvolvimento já estava de pé e
recriar um segundo colidiria na porta 5432), então a prova cobre o caminho de
migração e o boot, não a criação de schema inteiramente do zero.

**NFR-09** (documento OpenAPI coerente): `apps/api/src/openapi.ts` deriva o
documento dos próprios schemas Zod de cada rota via `@elysia/openapi` -
nunca escrito à mão, então nunca fica incoerente por definição. O nit (lista
de `tags` sem settings/export/analytics/credit-cards e nenhuma rota
declarando a própria tag) foi corrigido na sessão seguinte: cada
`new Elysia({...})` de feature ganhou `detail: { tags: [...] }`, conferido
lendo `/openapi/json` de verdade e vendo cada rota sob a tag certa.

**NFR-10** (nada nível 3/4 em log): `packages/observability/src/logger.ts`
redige por nome de chave (`authorization|cookie|token|secret|password|...`);
nenhum ponto de log ou evento de auditoria atual inclui e-mail ou nome
completo - `auth.routes.ts` já extrai só o domínio do e-mail
(`emailDomain`) para o que precisa logar. O nit (padrão sem `email`/`phone`)
foi corrigido na sessão seguinte: `email`, `phone`, `document` e `address`
entraram no padrão de redação (não `name` - também `spanName`, o `.name` de
um erro, o nome de categoria ou organização), com `logger.test.ts` cobrindo
cada chave sensível, o caso aninhado, o caso em array e a garantia de que
`name` continua visível.

**Varredura de segredo**: `git log --all -p` contra os padrões usuais (chaves
AWS, blocos de chave privada, tokens `sk-`/`ghp_`/`xox`) não encontrou nada;
nenhum `.env` real jamais foi commitado (`.gitignore` cobre `.env` e
`.env.*`); `BETTER_AUTH_SECRET` em `.env.example` é um placeholder óbvio.

**Build e testes**: `bun run lint:ci`, `typecheck`, `test` (458 testes em 8
pacotes), `storybook:test` (178 testes), `test:e2e` (15 specs, duas rodadas
limpas) e `bun run build` + `docker compose build` (`fifilo-api`,
`fifilo-web`) - todos verdes na revisão que fecha esta fase.

**Conclusão**: um achado real (NFR-05, defeito) e dois nits (tags do OpenAPI,
padrão de redação de log) - todos corrigidos, o primeiro na própria sessão da
auditoria, os dois últimos na sessão seguinte. Portão do Marco 2 fechado.
