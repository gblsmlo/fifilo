# Fase 12 — Serviços de plataforma

**Marco 3** · Estado: futuro. Depende de medida, não de plano.

## Objetivo

Registrar o que fica **fora** do monólito e sob qual gatilho cada coisa entra.
Este arquivo existe para que ninguém antecipe nenhum item dele — a regra de
escopo do `AGENTS.md` proíbe construir para necessidade hipotética, e cada
linha aqui é hipotética até a medida aparecer.

## O que fica para depois, e o gatilho de cada um

| Serviço | Entra quando | Sinal concreto |
| --- | --- | --- |
| Worker em processo separado | o laço em `apps/api` competir com requisição | latência de rota subindo junto com a fila |
| Fila fora do PostgreSQL | a fila do banco virar gargalo medido | contenção de lock ou tabela de fila com milhões de linhas |
| Redis para fanout multi-nó | houver mais de um nó de API | escala horizontal decidida, não presumida |
| WebSocket com hub | SSE não bastar | necessidade de canal bidirecional real |
| Sincronização bancária (Open Finance) | o cadastro manual for o atrito principal | usuário abandonando por digitação |
| Prometheus e painel de custo | o custo de IA precisar de rateio por workspace | cobrança ou limite comercial |
| Painel operacional interno | houver operação de verdade | descrito em [operation.md](../../engineering/operation.md) |
| App móvel | a web estiver estável e usada | retenção medida |

## Por que nada disso entra antes

O [Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2)
é explícito no mesmo ponto: o Redis é opcional e a implantação de nó único
precisa só de PostgreSQL. Uma plataforma de agentes inteira roda assim. O
Fifilo tem escopo menor e usuário nenhum — subir infraestrutura antes é custo
sem contrapartida, e cada serviço a mais é uma superfície a mais para vazar
dado financeiro.

## Sincronização bancária, quando chegar

É o único item da tabela que muda o domínio, não só a infraestrutura. Quando
entrar, ele reaproveita o que já existe:

- inbox de webhook com deduplicação por `(provider, external_event_id)`, já
  descrito em [operation.md](../../engineering/operation.md);
- conciliação contra os lançamentos da [Fase 01](fase-01-contas-carteiras-e-saldo.md),
  casando por valor e data com tolerância;
- a escada de categorização da [Fase 10](fase-10-memoria-e-rag.md), já treinada
  no histórico do próprio usuário;
- credencial de instituição como dado nível 4 pela
  [security.md](../../engineering/security.md), com o gate de dado real
  cumprido antes do primeiro token de banco entrar.

Esse é o dividendo de construir o núcleo primeiro: a integração mais complexa
do produto vira, em grande parte, ligação entre peças que já foram provadas.

## Registro de sessões

_(sem execução planejada)_
