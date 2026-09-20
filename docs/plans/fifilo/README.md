# Fifilo — roadmap por fase

Fifilo é gestão financeira pessoal e compartilhada, **AI-first no destino e
core-first no caminho**. Este diretório é o plano de execução: um arquivo por
fase, na ordem em que devem ser entregues.

## Autoridade e limites

Este plano é evidência e sequência. Ele **não autoriza** estrutura nova:
`AGENTS.md` manda nas regras executáveis, [`00-architecture-map.md`](../../00-architecture-map.md)
nomeia a fonte ativa de cada fronteira e [`decisions/README.md`](../../decisions/README.md)
registra o que é caro de reverter. Onde este plano propõe algo durável, ele diz
qual decisão precisa ser registrada **antes** da implementação.

A forma de cada entrega é a de [`feature-delivery-flow.md`](../../engineering/feature-delivery-flow.md):
modelagem → teste antes do transporte → rota → cliente documentado → Web →
stories e jornada. Nenhuma fase inventa outra ordem.

## Base herdada

O repositório nasce do starter `twincam` (commit único). Já vêm prontos e
**não são reconstruídos**: Better Auth com organizações, convites, 2FA e
recuperação de senha; Elysia + Eden; Drizzle + PostgreSQL 17; TanStack
Router/Query/Start; `packages/{core,auth,ui,patterns,observability}`;
`packages/infra/{env,database}`; Storybook como camada de teste; Playwright;
Docker; CI.

O starter é **neutro de domínio** por decisão própria. Fifilo é o produto em
cima dele. Toda tabela, contrato e vocabulário de finanças nasce aqui.

## A regra que ordena tudo

**Agente não entra antes do núcleo fechar.** Um agente que analisa a vida
financeira do usuário só vale o que valem os dados que ele lê. Sem conta,
categoria, transação, fatura e projeção corretas, um agente produz texto
convincente sobre número errado — o pior resultado possível num produto
financeiro.

Por isso o Marco 2 tem um portão duro: nenhuma fase de IA começa antes do
Marco 1 estar fechado pelos critérios da [Fase 06](fase-06-settings-e-aceitacao.md).

## Marcos e fases

Este é o quadro de estado, e o único: uma fase não tem estado em outro lugar.
Cada caixa marcada aqui corresponde ao critério de conclusão da fase, inteiro,
com evidência no registro de sessões dela. Uma fase não fecha por consenso.

Legenda: `[x]` concluída · `[~]` em andamento · `[ ]` aberta.

### Marco 1 — Núcleo financeiro

O que o usuário chamou de "primeira fase concluída com sucesso". Entrega o
produto inteiro sem IA.

- [x] **00** [Fundação do produto](fase-00-fundacao-do-produto.md) — primitivo de dinheiro, data civil, chave composta de tenant, baseline de RLS, envelope de idempotência
- [x] **01** [Contas, carteiras e saldo](fase-01-contas-carteiras-e-saldo.md)
- [x] **02** [Categorias e transações](fase-02-categorias-e-transacoes.md)
- [x] **03** [Cartão de crédito](fase-03-cartao-de-credito.md)
- [x] **04** [Workspace compartilhado](fase-04-workspace-compartilhado.md)
- [x] **05** [Analytics e gráficos](fase-05-analytics-e-graficos.md)
- [x] **06** [Settings, aceitação e entrega](fase-06-settings-e-aceitacao.md)
- [~] **06a** [Onboarding financeiro](fase-06a-onboarding-financeiro.md)

A Fase 06a é Marco 1 pelo conteúdo e foi entregue depois da auditoria de
aceitação que fechou o marco, já com a Fase 07 em execução. O sufixo registra
os dois fatos; a fase explica por que a sequência 07–12 não foi renumerada.

#### 06a — o que falta

Toda fatia de commit existe na árvore de trabalho; nenhuma foi commitada.

- [x] `feat(core): add financial onboarding status and dismissal`
- [x] `feat(database): persist financial onboarding progress with an actor-scoped policy`
- [x] `feat(api): expose the financial onboarding endpoints`
- [x] `feat(web): add the onboarding route group and its dedicated layout`
- [x] `docs: record decisions 034-035`
- [ ] Commitada, com `lint:ci`, `typecheck`, `test`, `storybook:test` e `test:e2e` rodados contra uma árvore limpa

### Marco 2 — Inteligência

Só começa com o Marco 1 fechado. Referência de plataforma: [Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2).

- [x] **07** [Fundação de IA](fase-07-fundacao-de-ia.md) — port do provedor, adaptadores Anthropic e OpenRouter, redação, orçamento, kill switch, auditoria
- [~] **08** [Chat financeiro](fase-08-chat-financeiro.md)
- [ ] **09** [Insights e relatórios](fase-09-insights-e-relatorios.md)
- [ ] **10** [Memória e RAG](fase-10-memoria-e-rag.md)
- [ ] **11** [Agentes gerenciados](fase-11-agentes-gerenciados.md)

#### Portão operacional — chamada real a cada provedor

A Fase 07 entregou o port, os dois adaptadores e os quatro guardrails com
suíte verde, e ficou com um único item aberto: a contabilidade de token
conferida contra uma chamada real, impossível sem `ANTHROPIC_API_KEY` e
`OPENROUTER_API_KEY`. Esse item **não é código da Fase 07**; é integração com
um serviço de terceiro, e mantê-lo como critério de conclusão de uma fase de
código deixou a Fase 08 começar contra uma dependência declarada aberta.

O item sai da Fase 07 e vira um portão operacional com dono próprio:

> Nenhuma superfície de IA chega a um usuário antes de uma chamada real a
> Anthropic e a OpenRouter ter rodado com a contabilidade de token conferida
> contra a resposta do provedor.

- [ ] Chamada real à Anthropic, contabilidade de token conferida
- [ ] Chamada real ao OpenRouter, contabilidade de token conferida

O portão incide sobre a fatia de Web da [Fase 08](fase-08-chat-financeiro.md),
que é onde a IA fica visível. Núcleo, persistência e rota podem ser entregues
antes dele; tela, não.

#### 08 — o que falta

- [x] `feat(core): add assistant conversations and read-only tool surface` — `d0235e0`
- [x] `feat(database): persist conversations and messages with tenant policies` — `8b6c797`
- [ ] `feat(api): expose the assistant streaming endpoint`
- [ ] `feat(web): add the assistant journey`
- [ ] `test(assistant): add tool authorization and arithmetic evidence`

Critério aberto além das fatias não entregues:

- [ ] Asserção de isolamento de workspace nas cinco ferramentas que não têm — só `list_transactions` tem
- [ ] Cobertura de `viewer` além de `create-conversation` e `list_transactions`
- [ ] Teste de aritmética: a resposta do agente bate com a projeção
- [ ] Cancelamento no meio do stream, com token contabilizado
- [ ] Caminho de recusa de conselho de investimento regulado
- [ ] Cinco provas negativas de RLS em `conversations` e `messages` — a migração `0007` criou as duas tabelas com policy e nenhuma prova
- [ ] Story dos estados do chat; E2E de uma conversa que chama ferramenta

### Marco 3 — Plataforma

- [ ] **12** [Serviços de plataforma](fase-12-plataforma.md)

## Requisitos funcionais — Marco 1

- [x] **FR-01** Criar conta, entrar, recuperar senha, 2FA — base
- [x] **FR-02** Criar workspace no onboarding — base
- [x] **FR-03** Convidar membro por e-mail e aceitar convite — base
- [x] **FR-04** Papel somente-leitura para membro convidado — 04
- [x] **FR-05** Criar, editar e arquivar conta financeira (corrente, poupança, carteira, investimento) — 01
- [x] **FR-06** Cadastrar cartão de crédito com limite, dia de fechamento e de vencimento — 03
- [x] **FR-07** Ver saldo por conta e saldo consolidado do workspace — 01
- [x] **FR-08** Criar, editar e arquivar categoria com tipo, cor, ícone e subcategoria — 02
- [x] **FR-09** Registrar, editar e apagar receita e despesa — 02
- [x] **FR-10** Transferir entre contas do workspace — 02
- [x] **FR-11** Registrar compra parcelada no cartão — 03
- [x] **FR-12** Ver itens da fatura, fechar e pagar a fatura — 03
- [x] **FR-13** Listar e filtrar transações por período, conta, categoria, tipo e busca — 02
- [x] **FR-14** Dashboard com fluxo do mês, saldo consolidado e gasto por categoria — 05
- [x] **FR-15** Gráficos de fluxo mensal, despesa por categoria e evolução de saldo — 05
- [x] **FR-16** Configurar moeda, fuso, locale e dia de início do mês do workspace — 06
- [x] **FR-17** Preferências do usuário (tema, notificação) — 06
- [x] **FR-18** Trilha de auditoria de convite, mudança de papel e remoção — base + 04
- [~] **FR-19** Conduzir o dono que criou o workspace até moeda, fuso e primeira conta, com adiamento e retomada — 06a, construída e não commitada

## Requisitos não funcionais — Marco 1

- [x] **NFR-01** Toda tabela de tenant com RLS `FORCE` e cobertura negativa (duas organizações, sem contexto, `WITH CHECK`, rollback) — 00 em diante
- [x] **NFR-02** Dinheiro em unidade menor inteira; nenhum ponto flutuante em qualquer camada — 00
- [x] **NFR-03** Data do fato financeiro é `date`; fuso só existe na leitura — 00
- [x] **NFR-04** Escrita concorrente por `version` com update condicional — 01 em diante
- [x] **NFR-05** `idempotency_key` em todo comando com efeito externo — 00
- [x] **NFR-06** Contrato Zod na borda da rota; Web consome por Eden (Decision 012, Decision 013) — todas
- [x] **NFR-07** Três runners, uma camada por comportamento (Decision 008, Decision 009) — todas
- [x] **NFR-08** `.env.example` sobe um clone limpo sem edição manual — 06
- [x] **NFR-09** Documento OpenAPI coerente sempre que rota ou contrato mudar — todas
- [x] **NFR-10** Nenhum dado nível 3 ou 4 em log, métrica ou payload de terceiro — todas

NFR-01 vale para as tabelas expostas. `conversations` e `messages` têm policy e
não têm prova, e ainda não estão expostas — essa caixa é da Fase 08, acima.

## Achados herdados do Financy

O Financy (Fastify + Mercurius + Prisma + SQLite) modelou o mesmo domínio numa
stack diferente e produziu defeitos reais. Cada um vira uma restrição aqui, não
um aprendizado solto:

1. **FK prova existência, não posse.** No Financy, a FK de `categoryId`
   permitia linkar a categoria de outro usuário. No PostgreSQL a validação de
   FK não passa por RLS, então o problema se repete. Restrição: chave e FK
   compostas por `(organization_id, id)` — [Fase 00](fase-00-fundacao-do-produto.md).
2. **Virada de mês em UTC contava as últimas horas do mês para o mês seguinte.**
   Restrição: o fato financeiro é `date`, nunca `timestamp`; o fuso entra só na
   apresentação e na agregação — [Fase 00](fase-00-fundacao-do-produto.md).
3. **Apagar categoria com transação vinculada.** Restrição: arquivar em vez de
   apagar, com fluxo explícito de reatribuição — [Fase 02](fase-02-categorias-e-transacoes.md).
4. **Mensagem crua do driver vazando para a tela.** Restrição: `Result` com
   `DomainError` tipado, mapeado para HTTP no adaptador e para campo de
   formulário no Web — todas as fases.
5. **Limite de validação só no servidor.** Restrição: o contrato é a única
   fonte; o formulário deriva dele.
6. **Front sem suíte de teste até a auditoria.** Restrição: cada fatia entrega
   sua camada de teste junto, não depois.
7. **N+1 afirmado sem medida e depois retratado.** Restrição: afirmação de
   desempenho só com plano de query ou medida anexada.

## Convenção destes documentos

Cada arquivo de fase tem a mesma forma: objetivo, escopo (entra e não entra),
modelagem em Core, persistência, API, Web, decisões a registrar, riscos e
critério de conclusão executável. O critério de conclusão é o contrato da fase:
enquanto um item estiver aberto, a fase não fechou.

**Fase planejada não reserva número de decisão.** A tabela "Decisões a
registrar" de uma fase que ainda não começou nomeia o assunto e deixa o número
como `—`. O número sai de [`decisions/README.md`](../../decisions/README.md) no
momento de registrar, e só então entra no arquivo da fase. Reservar de antemão
já produziu colisão: a Fase 07 consumiu 032 e 033, que a Fase 08 tinha
reservado, e a Fase 06a consumiu 034 e 035, que a Fase 09 tinha reservado. O
índice é o resolvedor (Decision 015); um plano não é.

O registro de sessão de cada fase entra no próprio arquivo, ao final, com data
e evidência — do mesmo jeito que o Financy registrou.
