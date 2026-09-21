# Fase 06b — Ativação do onboarding

**Marco 1** · Depende de: [Fase 06a](fase-06a-onboarding-financeiro.md) ·
Entrega: quem termina o setup vê o próprio saldo e um workspace utilizável, em
vez de um painel zerado.

## Por que esta fase tem sufixo

A [Fase 06a](fase-06a-onboarding-financeiro.md) fechou a lacuna estrutural: a
organização recém-criada passou a ter moeda, fuso e primeira conta antes da
primeira leitura. O sufixo `b` registra que esta é a continuação direta dela —
mesmo assunto, mesmo grupo de rotas, mesma régua de completude — e não uma fase
nova na sequência. Renumerar 07–12 falsificaria o histórico de entrega, pelo
mesmo motivo que a 06a já documentou.

## Objetivo

A 06a garantiu que o workspace tem os três fatos que toda projeção do Marco 1
lê. O que ela não garantiu é que exista **algo para ler**. A conta nasce com
saldo zero, o workspace nasce sem nenhuma categoria, e o usuário chega ao painel
com gráfico vazio depois de ter respondido três telas.

Esta fase troca o desfecho do onboarding: de "configuração concluída" para "seu
saldo é R$ X". É a diferença entre um formulário preenchido e um produto que já
disse algo verdadeiro sobre a vida financeira de quem o preencheu.

## Diagnóstico

O que foi lido na árvore, não o que se supõe:

| # | Achado | Evidência |
| ---: | --- | --- |
| 1 | O formulário de conta descarta saldo de abertura. O contrato aceita, a rota repassa, o caso de uso semeia o lançamento — só o `pick()` do Web não inclui | [`account-form.ts:11`](../../../apps/web/src/features/accounts/schemas/account-form.ts), [`accounts.routes.ts:120`](../../../apps/api/src/features/accounts/accounts.routes.ts), [`create-account.ts:57`](../../../packages/core/src/accounts/use-cases/create-account.ts) |
| 2 | A justificativa da omissão está obsoleta: o JSDoc diz que falta um input monetário mascarado, e ele existe desde a Fase 02 | [`account-form.ts:1-10`](../../../apps/web/src/features/accounts/schemas/account-form.ts) contra [`money-input.tsx`](../../../packages/ui/src/components/money-input.tsx) e [`transaction-form-fields.tsx:60`](../../../apps/web/src/features/transactions/components/forms/transaction-form-fields.tsx) |
| 3 | Nenhuma categoria padrão. A primeira transação não tem como ser classificada | Nenhum seeding em `packages/core/src/categories` nem em `apps/api/src/features/categories` |
| 4 | Slug obrigatório na primeira tela, descrito como "identificador único usado em URLs e integrações", antes de qualquer valor entregue | [`organization-onboarding-page.tsx:82`](../../../apps/web/src/features/organizations/organization-onboarding-page.tsx) |
| 5 | `locale` e `timezone` são texto livre, ambos detectáveis por `Intl` | [`workspace-settings-setup.tsx:127`](../../../apps/web/src/features/onboarding/components/workspace-settings-setup.tsx) |
| 6 | `credit_card` é selecionável no formulário genérico, mas fechamento, vencimento e limite vêm de um endpoint separado. A conta nasce inutilizável, sem badge e sem aviso — o único caminho de volta é um item do menu de ações | `attachCreditCardRequestSchema` em [`credit-cards/schemas.ts:15`](../../../packages/core/src/credit-cards/schemas.ts), [`account-list.tsx:152`](../../../apps/web/src/features/accounts/components/account-list.tsx) |
| 7 | Instituição é texto livre enquanto existe lista curada com `brandColor` e `aliases`. A cor do avatar só acerta se o usuário digitar o nome exato | [`institutions.ts`](../../../apps/web/src/features/accounts/institutions.ts) contra [`account-form.tsx:83`](../../../apps/web/src/features/accounts/components/forms/account-form.tsx) |
| 8 | A conclusão oferece "Convidar alguém" antes do primeiro lançamento | [`onboarding-completion.tsx:21`](../../../apps/web/src/features/onboarding/components/onboarding-completion.tsx) |
| 9 | O progresso do shell é string estática | [`(onboarding)/route.tsx:14`](../../../apps/web/src/routes/(onboarding)/route.tsx) |
| 10 | O lembrete navega por `<a href>` e recarrega a aplicação inteira | [`setup-reminder.tsx:20`](../../../apps/web/src/features/onboarding/components/setup-reminder.tsx) |
| 11 | A mesma coisa é chamada de "organização", "workspace" e "painel" na mesma jornada | título e descrição em [`organization-onboarding-page.tsx`](../../../apps/web/src/features/organizations/organization-onboarding-page.tsx) |
| 12 | O hook `afterCreateOrganization` roda depois dos commits da organização e do membro, fora de transação e sem `try/catch`. Uma exceção ali deixa workspace órfão, sessão sem organização ativa e a retentativa batendo em slug duplicado | `crud-org.mjs:74`, `:100`, `:137`, `:142`; `grep -n "transaction" crud-org.mjs` não retorna nada; [`server.ts:13`](../../../packages/auth/src/server.ts) não liga transação no adaptador |
| 13 | O lançamento de abertura entra no saldo e não aparece na listagem: o saldo é `sum(amount_minor)` sobre `entries` sem join, a abertura é gravada sem `transaction_id`, e a listagem parte de `transactions` | [`entry-reader-persistence.ts:20`](../../../apps/api/src/features/accounts/entry-reader-persistence.ts), [`financial-accounts-persistence.ts:105`](../../../apps/api/src/features/accounts/financial-accounts-persistence.ts), [`schema.ts:461`](../../../packages/infra/database/src/schema.ts), [`transactions-persistence.ts:56`](../../../apps/api/src/features/transactions/transactions-persistence.ts) |

Os achados 12 e 13 foram levantados como riscos ao escrever esta fase e
verificados antes de qualquer linha de código. Os dois mudaram o desenho: o
seeding saiu do hook e a abertura deixou de ser candidata a virar transação.
O achado 12 **já é exposição hoje** — o hook insere a linha de progresso e
escreve auditoria com a mesma falta de rede; esta fase não o cria, e deixa de
alargá-lo.

`ACCOUNT_KIND_LABELS` está duplicado em `account-form.tsx:18` e
`account-list.tsx:33`. É achado, não escopo desta fase.

### O que a literatura diz, e o que ela não resolve aqui

Entrada manual é a causa número um de abandono em produto de finanças pessoais,
com churn três vezes maior, e a ativação cai de 26% no primeiro dia para 14% no
trigésimo: quem não chega ao momento de valor na primeira sessão não volta.

O remédio padrão — sincronização bancária — não existe em nenhuma fase até a
[Fase 12](fase-12-plataforma.md). **Inferência:** sem sync, o único momento de
valor disponível no primeiro minuto é o usuário ver o próprio saldo na tela de
conclusão, porque é o único fato verdadeiro que o produto consegue produzir com
o que já foi digitado. É exatamente isso que o achado 1 bloqueia.

Isso torna o achado 1 a fatia de maior alavanca da fase, e também a mais barata:
três das quatro camadas já estão prontas.

## Escopo

### Entra

- Saldo de abertura e a data dele no formulário de criação de conta, e a cópia
  que explica onde esse valor aparece e onde não aparece.
- Conjunto padrão de categorias, semeado por um endpoint idempotente que o
  onboarding chama.
- Passo de região pré-preenchido por `Intl`, com moeda, fuso e formato
  confirmados em vez de digitados.
- Conclusão que mostra o saldo consolidado real e leva ao primeiro lançamento.
- Configuração do cartão encadeada à criação de uma conta `credit_card`.
- Progresso real no shell, slug derivado do nome, instituição por combobox,
  lembrete por `<Link>`.

### Não entra

- **Semear categorias no hook do Better Auth.** O achado 12 fecha a porta: o
  hook não tem transação nem rede de segurança, e uma falha ali produz workspace
  órfão. A alternativa está desenhada na seção de API.
- **Trazer o lançamento de abertura para a listagem de transações.** O achado 13
  é comportamento correto, não defeito: a abertura é um `entry` datado e
  deliberadamente não é uma transação (Fase 01 § Modelagem, Decision 021). O que
  entra é a cópia que explica isso; o que não entra é fabricar uma transação ou
  trocar a semântica da listagem.
- **Consertar a falta de rede do hook `afterCreateOrganization`.** O achado 12
  é anterior a esta fase e atinge a linha de progresso e a auditoria da 06a.
  Esta fase deixa de alargá-lo e registra o achado; o conserto tem dono próprio.
- **Badge "Cartão não configurado" na linha da conta.** Não há endpoint que
  diga em lote quais cartões estão configurados: hoje só `GET
  /credit-cards/:accountId/available-limit` responde isso, uma conta por vez.
  Com o encadeamento acima, o estado que o badge avisaria deixa de nascer;
  ele volta a fazer sentido quando a listagem de contas carregar a
  configuração do cartão, que é contrato novo.
- **Sincronização bancária e importação de extrato.** É o teto de retenção do
  produto e não é o problema desta fase; nenhuma delas foi pedida no Marco 1.
- **Passo novo na régua de completude.** `complete` continua
  `settingsConfigured && accountCreated` ([`use-cases.ts:21`](../../../packages/core/src/onboarding/use-cases.ts)).
  A Decision 034 declara que qualquer passo novo é decisão nova, e o seeding de
  categorias é deliberadamente invisível para não virar um.
- **Convite.** É base e [Fase 04](fase-04-workspace-compartilhado.md). Sai da
  tela de conclusão; não ganha tela própria.
- **Tour guiado, checklist persistente, orçamento e meta.** Ninguém pediu, e a
  regra de escopo do `AGENTS.md` proíbe antecipar.

## Fluxo

| Passo | Tela | O que pede | O que deriva |
| ---: | --- | --- | --- |
| 1 | Workspace | Nome | slug por `slugify`, revelado só em conflito |
| 2 | Região | Confirmar moeda, fuso e formato numa linha | `Intl.DateTimeFormat().resolvedOptions()` e `navigator.language` |
| 3 | Primeira conta | Nome, tipo, instituição, saldo de hoje | data do saldo igual a hoje, editável |
| 3b | Cartão | Fechamento, vencimento, limite | só quando `kind === 'credit_card'` |
| 4 | Pronto | — | saldo consolidado real |

O passo corrente continua sendo resolvido do status, não de parâmetro de URL: a
retomada que a 06a entregou não muda.

As categorias padrão nascem na entrada do passo 2, no `loader` de
`/onboarding/setup`, que já roda a cada visita. Não são passo, não aparecem e
não entram na régua de completude. Colocá-las ali — e não na criação do
workspace — é o que dá a elas uma retentativa por construção: qualquer volta ao
onboarding, inclusive pelo lembrete, repara um workspace que ficou sem
categoria.

## Vocabulário

A UI usa **workspace** e só workspace. A Decision 026 já declara que a
organização é o workspace financeiro; a tela é o único lugar onde os três nomes
ainda convivem. `organization` continua sendo o termo do Better Auth, da rota e
do banco — isto é regra de cópia, não de identificador.

| Onde | Hoje | Depois |
| --- | --- | --- |
| Passo 1, título | Crie sua organização | Como vamos chamar seu workspace? |
| Passo 1, campos | Nome · Slug | Nome |
| Passo 1, botão | Criar organização | Continuar |
| Passo 2, título | Configure seu workspace | Confirme sua região |
| Passo 2, descrição | Escolha como o Fifilo deve interpretar datas e valores. | Detectamos Real brasileiro, America/Sao_Paulo e português do Brasil. |
| Passo 2, ações | Continuar | Está certo · Alterar |
| Passo 3, título | Crie sua primeira conta | Onde está seu dinheiro hoje? |
| Passo 3, descrição | Comece com uma conta corrente, carteira ou investimento. | Comece pela conta que você mais usa. Dá para adicionar outras depois. |
| Passo 3, campo novo | — | Saldo hoje · Data do saldo |
| Passo 3, ajuda | — | O saldo que aparece no seu extrato agora. Entra no total como ponto de partida, sem virar um lançamento. |
| Passo 4, título | Configuração concluída | Seu saldo: R$ 4.280,00 |
| Passo 4, descrição | Seu workspace já está pronto para organizar sua vida financeira. | Tudo pronto. Registre um lançamento para o painel ganhar vida. |
| Passo 4, ações | Ir para o painel · Convidar alguém | Registrar um lançamento · Ir para o painel |
| Adiar | Pular por agora | Faço isso depois |
| Lembrete, título | Finalize sua configuração financeira | Falta pouco para o painel fazer sentido |
| Lista de transações vazia | Registre uma despesa, receita ou transferência para começar. | O saldo inicial das suas contas já está no total. Registre uma despesa, receita ou transferência para o histórico começar. |
| Progresso do shell | Configuração inicial | Passo 2 de 3 |

Os rótulos de tipo de conta ficam como estão.

Duas linhas desta tabela — a ajuda do passo 3 e o estado vazio da listagem —
são a entrega inteira do achado 13. Elas dizem, nos dois lugares onde a dúvida
nasce, que o total e o histórico respondem a perguntas diferentes.

## Modelagem — `packages/core`

`packages/core/src/categories/default-set.ts`:

- `DEFAULT_CATEGORIES`, dado puro: nome, `kind` e `icon` de cada categoria do
  conjunto inicial. Plano, sem subcategoria — a hierarquia é escolha do usuário,
  e um nível herdado que ninguém pediu é escopo antecipado.
- `buildDefaultCategories(organizationId)`, função pura que devolve as linhas
  prontas para inserção. O `kind` é fixo por categoria (Decision 022), então o
  conjunto é declarado uma vez e nunca derivado em tempo de execução.

Conjunto inicial, treze categorias:

| `kind` | Categorias |
| --- | --- |
| `expense` | Alimentação · Moradia · Transporte · Saúde · Educação · Lazer · Compras · Serviços · Outros |
| `income` | Salário · Freelance · Rendimentos · Outros |

`packages/core/src/categories/use-cases/seed-default-categories.ts`:

- `seedDefaultCategories` recusa quem não é dono por
  `requireFinancialOnboardingAccess` — é superfície de onboarding, e a
  elegibilidade é a mesma da Decision 034.
- Curto-circuito antes de escrever: se `list` devolver qualquer categoria,
  inclusive arquivada, o caso de uso devolve `ok(0)` sem tocar no banco. É o
  que torna a chamada repetível sem custo e sem efeito.
- Devolve `Result<number, …>` com a contagem semeada, para a rota e o teste
  distinguirem "semeou treze" de "já havia".

`CategoryRepository` ganha `createMany(records)`. Treze `create` em sequência
não são a mesma coisa: a escrita precisa ser uma transação só, pelo mesmo motivo
que `reassignAndArchive` já é uma (Decision 003 — o adaptador é quem garante).

`packages/core/src/accounts/schemas.ts` exporta o predicado que hoje só existe
dentro do `.refine()` de `createAccountRequestSchema`. O `.pick()` do Web não
alcança um `.refine()` de wrapper, e restatear a regra no formulário duplicaria
o fato — Decision 002, um fato, um dono.

Nada mais muda em Core. `createAccount` já semeia o lançamento de abertura e
`getFinancialOnboardingStatus` não é tocado — em particular, `steps` não ganha
campo e `complete` não muda de fórmula.

## Persistência — `packages/infra/database`

**Nenhuma migração.** A última é `0008`, da 06a. O seeding escreve em
`categories`, tabela que a [Fase 02](fase-02-categorias-e-transacoes.md) já
criou com policy de tenant e chave composta.

`createMany` roda dentro de uma `withWorkspaceTransaction`, com
`onConflictDoNothing` na chave composta que a Fase 02 declarou. Treze linhas ou
nenhuma.

**`packages/auth/src/organization.ts` não é tocado.** O hook continua fazendo
exatamente o que a 06a entregou.

## API — `apps/api`

Uma rota nova, `POST /api/onboarding/categories` — renomeada para
`POST /api/onboarding/start` pelo conserto do `BUG-003`, que lhe acrescentou a
linha de progresso:

- Idempotente por construção — o curto-circuito está no caso de uso, então uma
  segunda chamada custa um `select` e devolve `{ seeded: 0 }`.
- Sem corpo. Não há nada a parametrizar: o conjunto é dado de Core, não escolha
  do cliente.
- `200`, não `201`. A chamada que não semeia nada não criou recurso nenhum, e o
  cliente trata as duas iguais (HTTP § recurso criado exige `Location`, que aqui
  não existiria na segunda chamada).
- O `Result` é mapeado pelo adaptador, sem `safeParse` no handler
  (Decision 002).

**Por que não no hook de criação do workspace.** O achado 12: o hook roda depois
dos commits da organização e do membro, fora de transação e sem `try/catch`. Uma
falha ali não desfaz nada, impede `setActiveOrganization` de rodar e devolve o
usuário a um `/onboarding` onde a retentativa colide com o slug que ele mesmo
acabou de gravar. Treze linhas a mais nessa janela é piorar uma exposição que já
existe.

**Por que não semear na leitura.** Um `GET /categories` que escreve viola a
semântica do método, atrapalha cache e condicional, e faz um retry de leitura
virar escrita. A chamada explícita custa uma requisição e não custa nada disso.

`POST /accounts` já declara `openingBalanceMinor` e `openingBalanceDate` e os
repassa ao caso de uso
([`accounts.routes.ts:120`](../../../apps/api/src/features/accounts/accounts.routes.ts)).
`POST /credit-cards/:accountId` já existe para o passo 3b. Nenhum dos dois muda.

## Web — `apps/web`

- `features/accounts`: o schema do formulário passa a incluir os dois campos, e
  `AccountFormFields` ganha `MoneyInput` e `<Input type='date'>` com hoje como
  padrão — os mesmos dois controles que `transaction-form-fields.tsx` já usa.
  Nenhum componente novo.
- `features/accounts`: instituição vira combobox sobre `institutions.ts`, com
  texto livre preservado como saída. O contrato continua aceitando texto livre;
  o que muda é a entrada.
- `features/accounts`: badge `Cartão não configurado` na linha cuja conta é
  `credit_card` sem configuração, e o item de menu vira ação primária nessa
  linha. É o que torna visível o estado que hoje é silencioso.
- `features/transactions`: o estado vazio da listagem passa a nomear o saldo
  inicial. É a resposta inteira ao achado 13 — a abertura continua fora da
  lista, e a lista passa a dizer por quê.
- `features/onboarding`: `WorkspaceSettingsSetup` troca os dois `Input` de texto
  por `Select`, pré-selecionados pelo que `Intl` resolver.
  `OnboardingCompletion` lê o saldo consolidado e leva ao lançamento.
  `SetupReminder` usa `<Link>`.
- `routes/(onboarding)/onboarding.setup.tsx`: o `loader`, que já chama
  `ensureQueryData` do status, passa a disparar `POST /api/onboarding/categories`
  antes de resolver. Uma escrita num `loader` é aceitável exatamente aqui:
  entrar no setup **é** o ato de configurar, não um efeito colateral de navegar.
  A falha não bloqueia a rota — o passo de conta continua utilizável e a próxima
  entrada tenta de novo.
- `features/organizations`: o campo de slug sai do formulário e só aparece
  quando a criação devolver conflito.
- `layouts/OnboardingLayout`: `progress` deixa de ser string fixa e passa a ser
  derivado do status, lido pela rota — o shell continua recebendo tudo por prop
  (Decision 035, Decision 006).

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 036 | [o conjunto padrão de categorias é semeado pelo onboarding, nunca pelo hook de criação do workspace](../../decisions/README.md) |

Três alternativas foram consideradas e recusadas:

1. **Quarta tela, o usuário escolhe as categorias.** Acrescenta um passo à
   jornada que esta fase existe para encurtar, e transforma a régua de
   completude derivada da Decision 034 numa régua com passo declarado.
2. **Hook `afterCreateOrganization`.** Recusada pelo achado 12, não por
   preferência: o hook não tem transação com as escritas que o precedem nem
   `try/catch`, e a falha ali é irreparável pelo usuário.
3. **Semear na primeira leitura de `GET /categories`.** Um `GET` que escreve
   quebra a semântica do método e transforma retentativa de leitura em escrita.

O que torna isto caro de reverter não é o conjunto de categorias — é o lugar da
escrita. Mover o seeding depois que houver workspace em produção exige saber
quais foram semeados por qual caminho.

Nada mais aqui é caro de reverter. Saldo de abertura é campo de formulário sobre
contrato existente; vocabulário é cópia; encadear o cartão é sequência de UI; a
resposta ao achado 13 é texto.

## Riscos

Os dois riscos que abriam esta seção foram verificados antes da implementação e
viraram os achados 12 e 13. O desenho acima é a resposta aos dois, então eles
saem daqui. O que sobra:

- **Quem adia no passo 1 fica sem categoria.** O `loader` só semeia na entrada
  do setup; quem criar o workspace e fechar a aba antes disso volta pelo
  lembrete, que leva ao setup e dispara o seeding. Quem nunca voltar fica sem —
  e também sem conta, que é o caso que o lembrete já existe para tratar.
- **A falha do seeding é silenciosa por escolha.** Ela não bloqueia o passo de
  conta. A consequência aceita: um workspace pode chegar ao formulário de
  lançamento sem categoria. O que torna isso tolerável é a retentativa a cada
  entrada; o que torna verificável é a contagem no retorno da rota.
- **Colisão de nome com categoria padrão.** Quem tentar criar "Alimentação"
  recebe `category_name_taken`. Comportamento correto; a mensagem precisa dizer
  que a categoria já existe, não que o nome é inválido.
- **Cartão encadeado são duas requisições.** Se a segunda falhar, a conta existe
  e o cartão não. O badge não é enfeite: é o que impede o estado inválido de
  ficar invisível de novo.
- **`Intl.supportedValuesOf('timeZone')`** precisa de piso de browser conferido.
  Sem ele, a lista curta atual é o fallback.
- **Data do saldo anterior ao mês corrente** muda o saldo consolidado sem mudar
  o fluxo do mês. É o comportamento certo e vai parecer errado; a ajuda do campo
  é o que desarma isso.
- **O achado 12 continua aberto fora desta fase**, como `BUG-003`. A linha de
  progresso e a auditoria da 06a seguem expostas a ele. Esta fase não piora
  nem conserta.

## Critério de conclusão

- [x] Achado 12 verificado: o hook roda fora de transação e sem `try/catch`
- [x] Achado 13 verificado: a abertura conta no saldo e não aparece na listagem
- [x] `seedDefaultCategories` com teste de papel insuficiente, de curto-circuito
      (workspace com categoria arquivada não semeia) e de contagem devolvida
- [x] `buildDefaultCategories` com teste de pureza e de `kind` fixo por
      categoria (Decision 022)
- [x] `createMany` prova que treze linhas entram numa transação só: falha no
      meio não deixa categoria parcial
- [x] Cinco provas negativas de RLS na escrita em lote — duas organizações,
      `WITH CHECK` cross-tenant, ausência de contexto e rollback
- [x] Segunda chamada a `POST /api/onboarding/categories` devolve `seeded: 0` e
      não escreve — teste de rota
- [x] Conta criada com saldo de abertura produz saldo consolidado igual ao
      informado — teste de caso de uso e teste de rota
- [x] Formulário de conta com saldo e data: story com `play` cobrindo entrada
      monetária, e `bun test` para a regra "valor exige data"
- [x] Story dos quatro estados do onboarding atualizada, com a conclusão
      exibindo saldo
- [x] Story do estado vazio da listagem com a cópia que nomeia o saldo inicial
- [x] E2E: primeiro acesso termina com saldo diferente de zero no painel e com
      categorias disponíveis no formulário de lançamento
- [x] E2E: workspace que adiou o setup recebe as categorias ao voltar pelo
      lembrete
- [x] E2E: conta de cartão criada no onboarding chega configurada
- [x] Decisão do seeding registrada e indexada
- [x] `lint:ci`, `typecheck`, `test`, `storybook:test` e `test:e2e` verdes contra
      uma árvore limpa — `60bf185`, com `test:e2e` em `--workers=1` (BUG-004)

## Fatias de commit

| # | Fatia | Commit |
| ---: | --- | --- |
| 1 | `feat(web): capture the opening balance when an account is created` | `647b4f3` |
| 2 | `feat(web): name the starting balance on the empty transaction list` | `983a5f2` |
| — | `fix(web): resolve workspace settings before the account dialog can open` | `bff5918` |
| 3 | `feat(core): add the default category set and its seeding use case` | `2f5088f` |
| 4 | `feat(api): expose the idempotent default category seeding endpoint` | `bfd56af` |
| 5 | `feat(web): seed the default categories on entering the setup step` | `b692a51` |
| 6 | `feat(web): confirm the detected region instead of typing it` | `673a4d3` |
| 7 | `feat(web): finish onboarding on the real balance and the first entry` | `7bc01f4` |
| 8 | `feat(web): configure a credit card as part of creating one` | `7ee394a` |
| 9 | `feat(web): derive the workspace slug and show the onboarding progress` | `0bce5d9` |
| 10 | `docs: record decision 036` | este |

A fatia sem número saiu de dentro da 1: o formulário passou a recusar renderizar
sobre um fuso adivinhado, e sem resolver a configuração antes o diálogo montava
vazio e remontava, perdendo o que já tinha sido digitado.

## Métricas

Instrumentar nesta ordem, porque cada uma responde à anterior:

1. Tempo entre sign-up e primeira conta criada.
2. Percentual que termina a primeira sessão com saldo consolidado diferente de
   zero — o número que esta fase existe para mover.
3. Percentual que adia o setup.
4. Percentual que volta pelo lembrete.
5. Tempo até o primeiro lançamento.

## Registro de sessões

### 2026-09-21 — fase escrita antes da implementação

Ao contrário da 06a, esta fase nasce como plano. O diagnóstico acima foi lido na
árvore em `b2f65d3` e cada linha dele aponta para arquivo e linha; nada nele é
suposição, exceto o que está rotulado como inferência.

Dois fatos sobre a 06a foram apurados nesta leitura e não foram corrigidos aqui,
porque pertencem ao arquivo dela e ao índice:

- A 06a foi commitada, em `db0425a feat: add financial onboarding flow` — uma
  entrega única, não as cinco fatias que ela planejou. O critério de conclusão
  da 06a e o quadro do [`README.md`](README.md) ainda dizem que nada foi
  commitado.
- O quadro marca as cinco fatias como entregues e, uma linha acima, afirma que
  nenhuma foi commitada. As duas afirmações não podem ser verdadeiras juntas.

### 2026-09-21 — os dois riscos verificados, e o desenho que eles mudaram

Os dois riscos que a primeira escrita desta fase deixou como "verificar antes da
fatia 1" foram verificados no mesmo dia, antes de qualquer código, e viraram os
achados 12 e 13. Nenhum dos dois é hipótese: os dois têm arquivo e linha.

O achado 12 matou o desenho original do seeding. A primeira escrita colocava as
categorias na mesma transação da linha de progresso, no hook
`afterCreateOrganization`, "uma transação, dois efeitos". A leitura de
`crud-org.mjs` mostrou que não existe transação nenhuma envolvendo o hook: a
organização e o membro já estão commitados quando ele roda, `setActiveOrganization`
roda **depois** dele, e não há `try/catch`. O seeding virou rota explícita e
idempotente, chamada pelo `loader` do setup.

O achado 13 matou uma fatia que nem chegou a ser escrita. A tentação era dar uma
`transaction` à abertura para ela aparecer na listagem — o que esbarraria na
invariante da Fase 02 de que `income` exige categoria, e acoplaria criação de
conta a categoria existir. A abertura fica como está; o que muda é a cópia em
dois lugares.

Custo da verificação: uma sessão de leitura. Custo de não ter verificado: duas
fatias construídas sobre premissa falsa, uma delas alargando uma exposição
existente.

### 2026-09-21 — fase implementada

Dez fatias entregues na ordem planejada, com um commit a mais que o plano não
previa e que a tabela acima registra.

Três desvios do plano, todos em aberto no texto acima:

- **O badge "Cartão não configurado" saiu do escopo.** Ele exigiria uma
  requisição por cartão, porque nenhum endpoint responde em lote quais estão
  configurados. Com a configuração encadeada à criação, o estado que ele
  avisaria deixa de nascer; o badge volta quando a listagem de contas carregar
  a configuração do cartão, que é contrato novo.
- **O passo de região virou confirmação com escape.** O plano dizia "confirmar
  numa linha"; a implementação mostra a linha detectada e guarda os três campos
  atrás de "Alterar", porque `Intl.supportedValuesOf('timeZone')` devolve
  centenas de zonas e nenhuma delas precisa estar na frente de quem só vai
  concordar.
- **`test:e2e` falha com dois workers e passa com um**, registrado como
  `BUG-004`. Reproduzido antes e depois desta fase, em specs que ela não toca.
  Não é achado desta entrega.

Os dois achados que sobraram saíram deste arquivo e viraram registro próprio em
[`docs/bugs/README.md`](../../bugs/README.md): `BUG-003` para a falta de rede do
hook de criação de workspace, `BUG-004` para a suíte E2E sob dois workers. Uma
fase não é backlog.
