# Fase 11 — Agentes gerenciados

**Marco 2** · Depende de: [Fase 10](fase-10-memoria-e-rag.md) · Entrega: o
produto vira plataforma de agentes, no sentido do
[Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2).

## Objetivo

Até aqui os agentes são fixos: o chat da Fase 08 e os geradores da Fase 09.
Esta fase os torna **configuráveis por workspace** — perfil, instrução,
ferramentas permitidas, agendamento e histórico de execução.

É a última fase antes de precisar de serviço novo. Ela é possível dentro do
monólito porque as dez fases anteriores construíram o que ela orquestra.

## O que se copia do Multica, e o que não

| Do Multica | Aqui | Por quê |
| --- | --- | --- |
| Perfil de agente com instrução, ferramentas e configuração própria | igual | é a abstração que torna o agente um dado, não código |
| Fila de tarefa com reivindicação e concorrência limitada | igual, sobre a fila da Fase 09 | já existe, não se duplica |
| Autopilot com gatilho cron e execução manual | igual | é o que torna proativo o que era sob demanda |
| Histórico de execução com token, custo e erro limitado | igual | sem isso não há como diagnosticar nem cobrar |
| Ator polimórfico (`member` ou `agent`) em tudo | já adotado na Fase 08 | evita lógica de caso especial |
| Daemon local que roda CLI de agente na máquina do usuário | **não** | o Fifilo não executa código do usuário; não há workdir, nem skill em disco, nem GC |
| Fanout multi-nó por Redis | **não, ainda** | um nó basta; entra no [Marco 3](fase-12-plataforma.md) |

## Escopo

### Entra

- `agent_profiles`: nome, instrução, modelo, allowlist de ferramenta, ativo.
- `triggers`: `cron` com fuso, `manual`, `event`.
- Execução agendada sobre a fila da Fase 09.
- Painel de execuções: status, duração, token, custo, erro, cancelar.

### Não entra

Webhook de entrada, ferramenta de escrita autônoma, agente que fala com serviço
externo em nome do usuário. Cada um exige seu próprio ciclo de confiança.

## Guardrails

Os do Multica que se aplicam, traduzidos:

1. **Allowlist no servidor.** A ferramenta permitida é validada onde a
   ferramenta é executada, não onde o perfil é lido. Perfil é dado do usuário;
   dado do usuário nunca é autorização.
2. **Recusa sem workspace.** Já é regra desde a Fase 07; aqui ela protege
   também a execução agendada, que não tem requisição HTTP para herdar contexto.
3. **Cron com fuso explícito.** "Todo dia 1º às 9h" depende do fuso do
   workspace da [Fase 06](fase-06-settings-e-aceitacao.md). Sem fuso, a
   execução vaza para o mês errado — a mesma família de defeito herdada do
   Financy, agora no agendador.
4. **Timeout e cancelamento.** Toda execução tem teto de duração e caminho de
   cancelamento que realmente interrompe o provedor.
5. **Erro com contexto limitado.** Buffer com teto guardado na execução. Sem
   ele, a falha vira um status sem diagnóstico.
6. **Kill switch acima de tudo.** Desligar a IA do workspace para o agendador
   junto, e a fila não acumula execução para disparar tudo na religada.

## Persistência

- `agent_profiles`: `(organization_id, id)`, `name`, `instructions`, `model`,
  `allowed_tools text[]`, `enabled`, `version`.
- `triggers`: `(organization_id, id)`, `agent_profile_id`, `kind`,
  `cron_expression`, `timezone`, `next_run_at`, `last_run_at`, `enabled`.
- `ai_runs` da Fase 07 ganha `agent_profile_id` e `trigger_id`.

RLS `FORCE` e as cinco provas negativas nas duas tabelas novas.

## Web

Página de agentes: lista de perfis, editor de instrução com pré-visualização
das ferramentas permitidas, agendamento e histórico. Cada execução abre com o
que entrou, o que saiu, quais ferramentas foram chamadas e quanto custou.

Transparência é requisito, não recurso: em produto financeiro, um agente que
age sem registro legível é indefensável.

## Critério de conclusão

- [ ] Ferramenta fora da allowlist é recusada na execução, com teste.
- [ ] Agendamento respeita o fuso do workspace, com teste em fuso deslocado.
- [ ] Cancelamento interrompe de verdade e contabiliza o consumido.
- [ ] Kill switch para o agendador; religar não dispara acúmulo.
- [ ] Painel mostra token, custo e erro de cada execução.
- [ ] Cinco provas negativas de RLS em `agent_profiles` e `triggers`.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 038 | perfil de agente é dado do workspace; a allowlist é aplicada na execução |
| 039 | gatilho cron carrega fuso explícito do workspace |

## Fatias de commit

1. `feat(core): add agent profiles and trigger rules`
2. `feat(database): persist agent profiles and triggers`
3. `feat(api): add the scheduler and run history endpoints`
4. `feat(web): add the agents journey`
5. `test(agents): add allowlist, timezone and cancellation evidence`

## Registro de sessões

_(a preencher durante a execução)_
