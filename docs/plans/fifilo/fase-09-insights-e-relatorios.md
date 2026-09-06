# Fase 09 — Insights e relatórios

**Marco 2** · Depende de: [Fase 08](fase-08-chat-financeiro.md) · Entrega: a IA
passa de reativa a proativa.

## Objetivo

O usuário não precisa perguntar. Todo mês fecha com um relatório; toda anomalia
relevante vira um insight. É a "consultoria" do produto, e é a primeira coisa
que roda sem ninguém esperando na frente da tela.

## Escopo

### Entra

- Fila de tarefas de IA com worker.
- Relatório mensal gerado ao fechar o mês.
- Detecção de anomalia: gasto fora do padrão, categoria em alta, assinatura
  duplicada, fatura acima da média.
- Superfície de insights com feedback do usuário.

### Não entra

Agendamento configurável pelo usuário e perfil de agente — são a
[Fase 11](fase-11-agentes-gerenciados.md). Worker em processo separado é
[Marco 3](fase-12-plataforma.md).

## Detecção antes do modelo

**A anomalia é detectada por estatística, não por LLM.** Média móvel, desvio
padrão por categoria, comparação com os mesmos meses anteriores, repetição de
valor e descrição. Tudo em SQL e em função pura, testável e determinístico.

O modelo entra **depois**, para explicar o que a estatística achou, em
linguagem que o usuário entende. A ordem importa: pedir para o modelo achar
padrão em lista de transações é caro, não reprodutível e erra sem avisar.

## Fila e worker

A base já tem a forma pronta em `notification_outbox` e a
[operação](../../engineering/operation.md) já descreve a mecânica. A fila de IA
segue o mesmo desenho, sem inventar padrão paralelo:

- `ai_tasks`: `(organization_id, id)`, `kind`, `status` em
  `pending · processing · done · failed`, `payload jsonb` com **referências**,
  `attempts`, `last_error`, `available_at`, `processed_at`.
- Worker reivindica com `FOR UPDATE SKIP LOCKED` numa instrução.
- Entrega ao menos uma vez, então o consumidor é idempotente.
- Esgotou tentativas, vira `failed` e aparece no painel. Nunca some em silêncio.
- A tarefa nasce na mesma transação do fato que a origina — outbox transacional.

Nesta fase o worker é um laço agendado dentro de `apps/api`. Processo separado
entra no Marco 3, quando houver volume que justifique.

## Insights

- `insights`: `(organization_id, id)`, `kind` em
  `monthly_report · anomaly · opportunity`, `period_start`, `period_end`,
  `author_type` em `member | agent`, `author_id`, `content jsonb`,
  `evidence jsonb`, `status` em `draft · published · dismissed`,
  `feedback` em `useful · not_useful | null`, `version`.

Duas regras que definem a qualidade do produto:

1. **Toda afirmação carrega evidência.** `evidence` guarda os ids de transação,
   categoria e fatura que sustentam cada número. A UI transforma isso em link.
   Um insight sem evidência não é publicado — é rejeitado pelo caso de uso, não
   pelo revisor.
2. **Feedback é dado, não enfeite.** `useful` e `not_useful` alimentam o ajuste
   dos limiares de detecção e a seleção do que vale a pena gerar. Sem o par
   evidência-feedback, a fase entrega texto bonito e nenhuma melhora.

RLS `FORCE` e as cinco provas negativas em `ai_tasks` e `insights`.

## API e Web

`GET /api/insights` com filtro por período e tipo; `POST /api/insights/:id/feedback`;
`POST /api/insights/:id/dismiss`.

No Web, os insights aparecem no dashboard e numa página própria. O relatório
mensal é uma página com seções, cada número clicável até a transação. Estado
vazio explica quando o primeiro relatório aparece — usuário novo não tem mês
fechado.

## Riscos

- **Relatório gerado sobre mês incompleto.** Fecha no fuso do workspace, com a
  regra de `monthStartDay` da Fase 06. Errar aqui produz um relatório
  convincente e falso.
- **Duplicação por reentrega.** A tarefa é idempotente por
  `(organization_id, kind, period_start)`; reprocessar substitui o rascunho, não
  cria o segundo.
- **Ruído.** Insight demais treina o usuário a ignorar todos. Teto por período e
  ordenação por impacto financeiro, não por ordem de detecção.
- **Custo silencioso.** Geração automática consome orçamento sem ninguém pedir.
  O orçamento da Fase 07 vale aqui e a recusa é visível no painel.

## Critério de conclusão

- [ ] Detectores estatísticos com teste determinístico sobre dado semeado.
- [ ] Worker com teste de reivindicação concorrente (duas instâncias, uma
      tarefa, um processamento).
- [ ] Teste de reprocessamento idempotente.
- [ ] Caso de uso rejeita insight sem evidência.
- [ ] Teste de que o mês fecha no fuso do workspace.
- [ ] Cinco provas negativas de RLS em `ai_tasks` e `insights`.
- [ ] E2E: semear dois meses → disparar o fechamento → relatório aparece →
      clicar numa evidência chega na transação.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 034 | anomalia é detectada por estatística; o modelo explica, não descobre |
| 035 | insight sem evidência rastreável não é publicado |

## Fatias de commit

1. `feat(core): add anomaly detectors and insight rules`
2. `feat(database): persist the ai task queue and insights`
3. `feat(api): add the insight worker and endpoints`
4. `feat(web): add the insights and monthly report journey`
5. `test(insights): add detector, worker and evidence coverage`

## Registro de sessões

_(a preencher durante a execução)_
