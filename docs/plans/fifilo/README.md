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

### Marco 1 — Núcleo financeiro

O que o usuário chamou de "primeira fase concluída com sucesso". Entrega o
produto inteiro sem IA.

| Fase | Título | Estado |
| ---: | --- | --- |
| 00 | [Fundação do produto](fase-00-fundacao-do-produto.md) | Concluída |
| 01 | [Contas, carteiras e saldo](fase-01-contas-carteiras-e-saldo.md) | Concluída |
| 02 | [Categorias e transações](fase-02-categorias-e-transacoes.md) | Concluída |
| 03 | [Cartão de crédito](fase-03-cartao-de-credito.md) | Concluída |
| 04 | [Workspace compartilhado](fase-04-workspace-compartilhado.md) | Concluída |
| 05 | [Analytics e gráficos](fase-05-analytics-e-graficos.md) | Concluída |
| 06 | [Settings, aceitação e entrega](fase-06-settings-e-aceitacao.md) | Concluída |

### Marco 2 — Inteligência

Só começa com o Marco 1 fechado. Referência de plataforma: [Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2).

| Fase | Título | Estado |
| ---: | --- | --- |
| 07 | [Fundação de IA](fase-07-fundacao-de-ia.md) | Bloqueada (chave de provedor pendente) |
| 08 | [Chat financeiro](fase-08-chat-financeiro.md) | Planejada |
| 09 | [Insights e relatórios](fase-09-insights-e-relatorios.md) | Planejada |
| 10 | [Memória e RAG](fase-10-memoria-e-rag.md) | Planejada |
| 11 | [Agentes gerenciados](fase-11-agentes-gerenciados.md) | Planejada |

### Marco 3 — Plataforma

| Fase | Título | Estado |
| ---: | --- | --- |
| 12 | [Serviços de plataforma](fase-12-plataforma.md) | Futuro |

## Requisitos funcionais — Marco 1

| # | Requisito | Fase |
| --- | --- | --- |
| FR-01 | Criar conta, entrar, recuperar senha, 2FA | base |
| FR-02 | Criar workspace no onboarding | base |
| FR-03 | Convidar membro por e-mail e aceitar convite | base |
| FR-04 | Papel somente-leitura para membro convidado | 04 |
| FR-05 | Criar, editar e arquivar conta financeira (corrente, poupança, carteira, investimento) | 01 |
| FR-06 | Cadastrar cartão de crédito com limite, dia de fechamento e de vencimento | 03 |
| FR-07 | Ver saldo por conta e saldo consolidado do workspace | 01 |
| FR-08 | Criar, editar e arquivar categoria com tipo, cor, ícone e subcategoria | 02 |
| FR-09 | Registrar, editar e apagar receita e despesa | 02 |
| FR-10 | Transferir entre contas do workspace | 02 |
| FR-11 | Registrar compra parcelada no cartão | 03 |
| FR-12 | Ver itens da fatura, fechar e pagar a fatura | 03 |
| FR-13 | Listar e filtrar transações por período, conta, categoria, tipo e busca | 02 |
| FR-14 | Dashboard com fluxo do mês, saldo consolidado e gasto por categoria | 05 |
| FR-15 | Gráficos de fluxo mensal, despesa por categoria e evolução de saldo | 05 |
| FR-16 | Configurar moeda, fuso, locale e dia de início do mês do workspace | 06 |
| FR-17 | Preferências do usuário (tema, notificação) | 06 |
| FR-18 | Trilha de auditoria de convite, mudança de papel e remoção | base + 04 |

## Requisitos não funcionais — Marco 1

| # | Requisito | Fase |
| --- | --- | --- |
| NFR-01 | Toda tabela de tenant com RLS `FORCE` e cobertura negativa (duas organizações, sem contexto, `WITH CHECK`, rollback) | 00 em diante |
| NFR-02 | Dinheiro em unidade menor inteira; nenhum ponto flutuante em qualquer camada | 00 |
| NFR-03 | Data do fato financeiro é `date`; fuso só existe na leitura | 00 |
| NFR-04 | Escrita concorrente por `version` com update condicional | 01 em diante |
| NFR-05 | `idempotency_key` em todo comando com efeito externo | 00 |
| NFR-06 | Contrato Zod na borda da rota; Web consome por Eden (Decision 012, Decision 013) | todas |
| NFR-07 | Três runners, uma camada por comportamento (Decision 008, Decision 009) | todas |
| NFR-08 | `.env.example` sobe um clone limpo sem edição manual | 06 |
| NFR-09 | Documento OpenAPI coerente sempre que rota ou contrato mudar | todas |
| NFR-10 | Nenhum dado nível 3 ou 4 em log, métrica ou payload de terceiro | todas |

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

O registro de sessão de cada fase entra no próprio arquivo, ao final, com data
e evidência — do mesmo jeito que o Financy registrou.
