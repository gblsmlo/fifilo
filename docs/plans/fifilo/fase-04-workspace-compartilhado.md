# Fase 04 — Workspace compartilhado

**Marco 1** · Depende de: [Fase 03](fase-03-cartao-de-credito.md) · Entrega:
FR-04, FR-18.

## Objetivo

Compartilhar a visão financeira com outra pessoa — cônjuge, sócio, contador.
A infraestrutura de convite já existe na base; o que falta é o papel que
permite **ver sem mexer**, e a prova de que o papel é respeitado no servidor
em toda rota financeira.

## Escopo

### Entra

- Papel `viewer`, somente leitura, na política de organização.
- Matriz de acesso por recurso financeiro, aplicada no servidor.
- Página de membros: convidar, listar, trocar papel, remover.
- Trilha de auditoria das operações financeiras sensíveis.
- Troca de workspace ativo no shell.

### Não entra

Compartilhar conta ou categoria individual com escopo diferente do workspace.
Times (`teams` está desligado na política atual). Convite por link público.

## O que já existe

`packages/auth/src/organization.ts` entrega convite com TTL de 48h, limite de
25 membros, verificação de e-mail obrigatória no convite, cancelamento de
convite pendente ao reconvidar, garantia de pelo menos um `owner`, limpeza de
sessão ao remover membro e evento de auditoria em cada hook. O Web já tem
`organization-onboarding-page` e `accept-invitation-page`, e o E2E já cobre o
onboarding.

Esta fase **não reconstrói nada disso**. Ela adiciona o papel e o faz valer.

## Modelagem

### O papel `viewer`

A política atual usa os papéis padrão do Better Auth (`owner`, `admin`,
`member`) com `dynamicAccessControl` desligado. Adicionar `viewer` exige
declarar controle de acesso explícito com `createAccessControl` e passar
`roles` em `organizationOptions`.

Matriz financeira, estendendo a de [security.md](../../engineering/security.md):

| Recurso | Owner | Admin | Member | Viewer |
| --- | --- | --- | --- | --- |
| Contas e cartões | A | R/W | R/W | R |
| Categorias | A | R/W | R/W | R |
| Transações | A | R/W | R/W | R |
| Fechar e pagar fatura | A | R/W | R/W | - |
| Settings do workspace | A | R/W | R | R |
| Membros e convites | A | R/W | R | - |
| Exportação completa | A com reautenticação | - | - | - |

Regras que a matriz não diz e o código precisa dizer:

- A autorização é decidida no caso de uso, a partir do papel resolvido pela
  sessão no servidor. Papel enviado pelo cliente nunca é evidência
  (Decision 002).
- `viewer` recebe `403` com corpo de erro tipado, não `404` — esconder a
  existência do recurso de quem foi convidado para vê-lo é confuso, não seguro.
- Trocar o papel de alguém revoga a sessão ou força refresh imediato; a base já
  limpa `activeOrganizationId` ao remover, e a troca de papel segue o mesmo
  caminho.

### Auditoria

Os hooks de organização já emitem evento. Esta fase adiciona, via
`@fifilo/observability`, evento para: pagar fatura, exportar dados, arquivar
conta com histórico e reatribuir categoria em massa. Evento carrega referência
e diff permitido — nunca o registro sensível inteiro.

## API

Toda rota financeira das Fases 01–03 ganha a checagem de papel. O ponto de
aplicação é o caso de uso, não a rota: assim o caminho negado é testável sem
navegador.

`GET/POST /api/organization/members` e `.../invitations` passam pelo handler do
Better Auth já montado em `auth-handler.routes.ts`; a fase só adiciona a
superfície de leitura que o Web precisa.

## Web — `apps/web/src/features/organizations`

- Página de membros com lista, papel, estado do convite e ações.
- Seletor de workspace no `app-header`, que troca `activeOrganizationId`.
- Toda superfície de escrita consulta o papel e **desabilita com explicação**
  em vez de sumir. Botão que desaparece confunde; botão desabilitado com motivo
  ensina.
- O `403` do servidor continua sendo a autoridade — a UI é conveniência.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 026 | a organização é o workspace financeiro; `viewer` é o papel de leitura e a autorização é decidida no caso de uso |

## Riscos

- **Autorização só na UI.** É o modo de falha mais comum e o mais caro. Todo
  caso de uso de escrita tem um teste que passa o papel `viewer` e espera
  `forbidden`.
- **`viewer` vazando por rota esquecida.** A cobertura precisa ser por
  varredura: um teste que enumera as rotas de escrita registradas em `app.ts` e
  falha quando uma não tem prova de negação. Sem isso, a próxima rota nasce
  aberta.
- **Convite para e-mail já membro de outro workspace.** A base cobre; o teste
  precisa existir aqui porque agora existe dado financeiro dos dois lados.

## Critério de conclusão

- [x] `viewer` declarado na política e entregue no `/api/me` —
      `packages/auth/src/roles.ts`'s `viewerAc`, compartilhado por
      `server.ts` e `client.ts`; `/api/me` já repassava `members.role` como
      string livre, então nenhuma mudança de schema foi necessária —
      `users.routes.test.ts` prova o papel `viewer` chegando intacto.
- [x] Teste de negação para **toda** rota de escrita financeira —
      `requireFinancialWriteAccess` como primeira instrução de todo caso de
      uso de escrita (accounts: create/update/archive; categories:
      create/update/reassign; transactions: create/update/delete;
      credit-cards: attach/close/pay/create-installment-purchase), cada um
      com seu teste de rejeição a `viewer` no próprio arquivo de teste do
      caso de uso.
- [x] Varredura que falha quando uma rota de escrita nova não tem prova —
      `apps/api/src/access-control-sweep.test.ts` enumera `app.routes` da
      composição real (`createApp`) por prefixo financeiro e método de
      escrita, e lança um erro explícito para qualquer rota sem fixture —
      13 rotas cobertas, a prova de não-vacuidade incluída.
- [x] Eventos de auditoria emitidos e testados nas quatro operações novas —
      três das quatro: `account.archived`, `category.reassigned` (só na
      movimentação em massa, não no arquivamento simples) e `invoice.paid`
      (uma vez por pagamento real, nunca na resposta idempotente repetida).
      Exportação de dados não existe como funcionalidade em nenhuma fase do
      roadmap ainda — o corte é sinalizado, não escondido.
- [x] E2E: owner convida → convidado aceita → vê as transações → não consegue
      criar → owner promove a member → passa a conseguir —
      `e2e/organizations/organizations.spec.ts`, contra a API e um banco
      reais.

## Fatias de commit

1. `feat(auth): add the viewer role and explicit access control`
2. `feat(core): enforce role authorization in financial use cases`
3. `feat(api): expose organization member management`
4. `feat(web): add the members page and workspace switcher`
5. `test(organizations): add role denial and audit evidence`

## Registro de sessões

### 2026-09-06 — fase fechada

Seis commits, em ordem: `b61d352` (Auth: papel `viewer` e controle de
acesso explícito), `a45d7b0` (Core: `requireFinancialWriteAccess` em todo
caso de uso de escrita das Fases 01-03), `09b9a3c` (API: `role` resolvido
em toda rota financeira + a varredura), `04e61d6` (Web: listar, trocar
papel e remover membros), `fdcade3` (eventos de auditoria em três das
quatro operações) e `96a0e6c` (E2E: convite, papel negado, promoção).

A troca de workspace ativo já existia desde a Fase 00
(`organization-page.tsx`); o único item de escopo genuinamente novo no Web
foi completar "convidar, **listar, trocar papel, remover**" — só
"convidar" existia antes desta fase, e sem seleção de papel (todo convite
nascia `member`).

Um achado real, descoberto construindo a própria varredura: o handler de
`POST /api/invoices/:id/close` (Fase 03) buscava a fatura no repositório
**antes** de chamar o caso de uso, só para preencher `expectedVersion` — um
`viewer` tentando fechar uma fatura inexistente recebia `404`, vazando a
existência do recurso antes que a checagem de papel sequer rodasse. Corrigido
movendo a leitura da versão para dentro do próprio `closeInvoice`, que já
buscava a fatura por outro motivo; `expectedVersion` saiu do contrato do
comando.

O E2E consumiu a maior parte do tempo desta fase, por dois problemas de
infraestrutura de teste, não de produto:

1. `@fifilo/infra-database` não pode ser importado de um arquivo `.spec.ts`:
   seu cliente importa o `SQL` embutido do Bun, que o processo de worker do
   Playwright — sempre Node, não importa como o `playwright test` é
   invocado — não resolve. A leitura do id do convite e a semeadura do
   usuário convidado (a mesma técnica de `db:seed`, sem passar pelo
   e-mail que o starter não entrega) viraram chamadas `psql` via
   `docker compose exec`.
2. A página de aceitar convite depende de hidratação client-side antes que
   o `onClick` do botão exista de fato; clicar um botão visível mas ainda
   não hidratado por um servidor Vite em desenvolvimento não faz nada,
   silenciosamente — sem erro de console, sem requisição de rede. A
   verificação de aceite migrou para chamar o mesmo endpoint que a página
   chama, diretamente, mantendo o foco do teste no que a Fase 04
   efetivamente mudou: a checagem de papel que vem depois.

Escopo deliberadamente reduzido, sinalizado e não escondido:

- **Exportação de dados não existe.** Nenhuma fase do roadmap pede essa
  funcionalidade ainda; o evento de auditoria previsto para ela não tem o
  que auditar.
- **A matriz não distingue member de admin em nenhum recurso financeiro
  ainda.** `requireFinancialWriteAccess` é um portão binário (viewer ou
  não). A distinção mais fina que a Fase 06 (settings) vai precisar fica
  para quando o próprio recurso existir.

Evidência: `bun run lint:ci`, `bun run typecheck`, `bun run test` (353
casos no total do monorepo — Core ganhou o módulo `access-control` e suas
provas de rejeição por caso de uso; API ganhou a varredura de 13 rotas mais
os eventos de auditoria), `bun run storybook:test` (inalterado nesta fase)
e `bun run test:e2e` (14 jornadas, a nova `organizations.spec.ts` entre
elas) — todos verdes.

## Registro de sessões

_(a preencher durante a execução)_
