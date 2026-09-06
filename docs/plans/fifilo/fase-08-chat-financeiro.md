# Fase 08 — Chat financeiro

**Marco 2** · Depende de: [Fase 07](fase-07-fundacao-de-ia.md) · Entrega: a
primeira superfície de IA visível.

## Objetivo

Conversar sobre a própria vida financeira: "quanto gastei com mercado nos
últimos três meses?", "por que a fatura subiu?", "sobra quanto depois das
contas fixas?".

## A regra que sustenta a fase

**Ferramenta de agente é caso de uso do Core, chamado com o mesmo contexto de
ator e workspace da requisição HTTP.**

Consequência direta: autorização, RLS, papel `viewer`, invariantes de
transferência e regra de fatura já valem para o agente, sem uma linha nova. O
agente não recebe conexão de banco, não escreve SQL e não tem caminho para ler
o que o usuário não poderia ler pela API.

A alternativa — dar SQL ao modelo — reintroduz de uma vez todo defeito que as
Fases 00 a 06 fecharam. Não é considerada.

## Escopo

### Entra

- Ferramentas somente-leitura sobre as projeções da
  [Fase 05](fase-05-analytics-e-graficos.md).
- Persistência de conversa e mensagem, com autor polimórfico.
- Resposta em streaming.
- Superfície de chat no Web.

### Não entra

Ferramenta de escrita — o agente não cria nem edita transação nesta fase.
Relatório assíncrono é [Fase 09](fase-09-insights-e-relatorios.md); memória é
[Fase 10](fase-10-memoria-e-rag.md).

## Ferramentas

Todas mapeiam um a um para caso de uso existente:

| Ferramenta | Caso de uso |
| --- | --- |
| `list_transactions` | `transactions.list` com os mesmos filtros |
| `account_balances` | `analytics.consolidatedBalance` |
| `cashflow_by_month` | `analytics.monthlyCashflow` |
| `spend_by_category` | `analytics.spendByCategory` |
| `credit_card_invoice` | `creditCards.invoice` |
| `top_expenses` | `analytics.topExpenses` |

Regras:

- O schema da ferramenta é o contrato Zod do caso de uso. Uma fonte, não duas.
- A saída passa pelo portão de redação da Fase 07: valores e referências saem,
  identificação pessoal não.
- Ferramenta sem correspondente em caso de uso não existe. Precisar de uma é
  sinal de que falta um caso de uso, e ele é escrito primeiro, com teste.

## Modelagem — `packages/core/src/assistant`

- `conversations`: `(organization_id, id)`, `created_by`, `title`,
  `provider_session_id`, `archived_at`.
- `messages`: `(organization_id, id)`, `conversation_id`, `author_type` em
  `member | agent`, `author_id`, `role`, `content jsonb`, `tool_call_id`,
  `token_usage`, `created_at`.

`author_type` polimórfico é copiado direto do Multica, onde `assignee_type` e
`author_type` deixam o agente participar como cidadão de primeira classe sem
lógica de caso especial. A alternativa — uma tabela separada para mensagem de
agente — duplica consulta e ordenação por nada.

`provider_session_id` é gravado assim que o provedor o emite, antes do fim da
execução. O Multica chama isso de *pinning* e a razão é a mesma: uma queda no
meio deixa um ponteiro utilizável em vez de uma conversa órfã.

RLS `FORCE` e as cinco provas negativas nas duas tabelas.

## API — `apps/api/src/features/assistant`

| Rota | Nota |
| --- | --- |
| `POST /api/assistant/conversations` | cria |
| `GET /api/assistant/conversations` | lista |
| `GET /api/assistant/conversations/:id/messages` | histórico |
| `POST /api/assistant/conversations/:id/messages` | envia e devolve stream SSE |

Streaming por SSE, não WebSocket. Um nó, sem Redis, sem hub — o próprio Multica
trata o fanout multi-nó como opcional, e a orientação do projeto é deixar
serviço extra para o [Marco 3](fase-12-plataforma.md). SSE sobre HTTP herda
autenticação por cookie e reconexão do navegador de graça.

Cancelamento: `AbortSignal` propagado até o adaptador, com a execução marcada
`cancelled` e o token consumido até ali contabilizado.

## Web — `apps/web/src/features/assistant`

- Histórico em TanStack Query; o texto que chega em streaming é estado efêmero
  em Zustand, e a mensagem final invalida a query. Evento nunca escreve direto
  no cache — mesma disciplina que o Multica documenta.
- Cada número que o agente afirma vem com referência clicável para as
  transações que o sustentam. É a defesa concreta contra alucinação: o usuário
  confere em um clique.
- Estados obrigatórios: pensando, usando ferramenta, erro, cancelado,
  orçamento esgotado, IA desligada.
- Aviso permanente e discreto de que a análise é informativa e não é
  recomendação de investimento.

## Riscos

- **Número inventado.** Mitigação estrutural: o modelo não calcula, ele chama
  ferramenta. O teste que importa é o de aritmética — a resposta bate com a
  projeção, conferida por asserção, não por leitura.
- **Vazamento por prompt.** O conteúdo da conversa é entrada do usuário, não
  instrução do sistema. A ferramenta não aceita nome de tabela, `where` cru nem
  identificador fora do contrato.
- **Custo por conversa longa.** Histórico cresce a cada turno. Janela com teto,
  resumo dos turnos antigos, e o orçamento da Fase 07 como último anteparo.
- **Conselho regulado.** Caminho de recusa testado, não confiado ao prompt
  sozinho.

## Critério de conclusão

- [ ] Seis ferramentas com teste de que respeitam papel e workspace.
- [ ] Teste de que `viewer` conversa e não escreve nada.
- [ ] Teste de aritmética: resposta do agente bate com a projeção.
- [ ] Teste de cancelamento no meio do stream, com token contabilizado.
- [ ] Teste do caminho de recusa de conselho de investimento.
- [ ] Cinco provas negativas de RLS em `conversations` e `messages`.
- [ ] Story dos estados do chat; E2E de uma conversa com ferramenta.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 032 | ferramenta de agente é caso de uso do Core sob o mesmo contexto de ator; o agente não acessa o banco |
| 033 | autor de mensagem é polimórfico (`member` ou `agent`) |

## Fatias de commit

1. `feat(core): add assistant conversations and read-only tool surface`
2. `feat(database): persist conversations and messages with tenant policies`
3. `feat(api): expose the assistant streaming endpoint`
4. `feat(web): add the assistant journey`
5. `test(assistant): add tool authorization and arithmetic evidence`

## Registro de sessões

_(a preencher durante a execução)_
