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

- [ ] `viewer` declarado na política e entregue no `/api/me`.
- [ ] Teste de negação para **toda** rota de escrita financeira.
- [ ] Varredura que falha quando uma rota de escrita nova não tem prova.
- [ ] Eventos de auditoria emitidos e testados nas quatro operações novas.
- [ ] E2E: owner convida → convidado aceita → vê as transações → não consegue
      criar → owner promove a member → passa a conseguir.

## Fatias de commit

1. `feat(auth): add the viewer role and explicit access control`
2. `feat(core): enforce role authorization in financial use cases`
3. `feat(api): expose organization member management`
4. `feat(web): add the members page and workspace switcher`
5. `test(organizations): add role denial and audit evidence`

## Registro de sessões

_(a preencher durante a execução)_
