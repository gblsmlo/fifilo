# Fase 07 — Fundação de IA

**Marco 2** · Depende do portão da [Fase 06](fase-06-settings-e-aceitacao.md) ·
Entrega: nenhuma funcionalidade visível.

## Objetivo

Instalar a camada de IA sem entregar nada ao usuário. Custo, limite, auditoria,
proteção de dado pessoal e desligamento vêm **antes** da primeira resposta
gerada — depois que existe usuário esperando, nenhum desses vira prioridade.

## A lição central da referência

O [Multica](https://dev.to/truongpx396/multica-deep-dive-how-to-build-a-managed-agents-platform-54l2)
resume a arquitetura em uma frase: *não construa o loop do agente, embrulhe-o*.
Ele define uma interface `Backend` com um método `Execute`, e cada provedor é
um arquivo que a implementa e normaliza a saída para uma taxonomia comum.

O Fifilo copia a forma, não o conteúdo: em vez de embrulhar CLIs de agente de
código, embrulha SDK de provedor de modelo. O ganho é o mesmo — trocar de
provedor é um arquivo, e nada do produto conhece o formato de ninguém.

## Escopo

### Entra

- `packages/ai`: port do provedor, taxonomia de mensagem, dois adaptadores -
  Anthropic API e OpenRouter.
- Contabilidade de token e custo por execução.
- Orçamento por workspace com recusa ao estourar.
- Kill switch por workspace e global.
- Portão de redação de dado pessoal antes da saída.
- Evento de auditoria por chamada.

### Não entra

Ferramenta, conversa, insight, embedding, agendamento. Tudo isso são as fases
08 a 11.

## Modelagem — `packages/ai`

```ts
export type AgentBackend = {
  run(input: AgentInput, options: RunOptions): AsyncIterable<AgentMessage>
}
```

Taxonomia de mensagem, adaptada do Multica: `text`, `thinking`, `tool-use`,
`tool-result`, `status`, `error`. Estados de resultado: `completed`, `failed`,
`aborted`, `timeout`, `cancelled`.

### Dois provedores desde o início

Diferente do padrão usual deste starter ("o segundo adaptador só entra quando
houver motivo"), aqui o motivo já existe e é explícito: Anthropic API dá
acesso direto aos recursos específicos de Claude (prompt caching, extended
thinking, o modelo mais novo no dia em que sai) sem a defasagem de um
agregador; OpenRouter dá acesso a modelos de múltiplos provedores atrás de
uma única chave e um formato só, cobrindo custo, fallback e comparação de
modelo sem multiplicar integração. Nenhum dos dois é "principal" - a escolha
de qual `AgentBackend` uma execução usa é configuração por workspace ou por
tipo de tarefa, decidida na Fase 08 em diante; esta fase só garante que os
dois existem, passam na mesma suíte de contrato, e trocar de um para o outro
é configuração, não código novo.

Regras de fronteira:

- `packages/ai` não importa `packages/infra/database`, `packages/auth` nem
  Elysia. Ele recebe capacidade injetada, como manda a Decision 001.
- Um adaptador por arquivo: `anthropic.ts` e `openrouter.ts`, cada um
  implementando o mesmo `AgentBackend`. Um terceiro provedor só entra quando
  houver motivo igualmente explícito - a existência do port é o que torna
  isso barato quando o motivo aparecer.
- Chave de API só por `packages/infra/env`, nunca `Bun.env` direto -
  `ANTHROPIC_API_KEY` e `OPENROUTER_API_KEY`, cada uma opcional
  individualmente (um ambiente pode rodar com um só provedor configurado),
  mas a validação de schema recusa a dupla ausência se a Fase 08 em diante
  depende de pelo menos um.

## Persistência

- `ai_runs`: `(organization_id, id)`, ator, tipo, provedor, modelo, status,
  `input_tokens`, `output_tokens`, `cost_minor`, `started_at`, `finished_at`,
  `error`, `duration_ms`. Custo em unidade menor, pelo primitivo `Money` da
  Fase 00 — o gasto com IA é dinheiro e segue a mesma regra do resto.
- `ai_budgets`: `(organization_id, period)`, `limit_minor`, `consumed_minor`.

RLS `FORCE` e as cinco provas negativas nas duas.

## Guardrails

Os quatro que vêm da [security.md](../../engineering/security.md) e da
[operation.md](../../engineering/operation.md), traduzidos para IA:

1. **Contexto obrigatório.** Uma execução sem `organizationId` é recusada antes
   de qualquer chamada externa. É a mesma guarda que o Multica aplica no daemon,
   pelo mesmo motivo: sem ela, uma falha silenciosa lê o workspace errado.
2. **Redação antes da saída.** Nome, e-mail, documento e qualquer campo nível 3
   ou 4 não saem em texto para o provedor. O que sai é agregado e referência
   opaca; a resolução de referência para nome acontece na volta, no servidor.
   Isso é regra de código com teste, não recomendação.
3. **Orçamento.** Estourou o limite do período, recusa com erro tipado e avisa.
   Sem limite, um laço com defeito vira fatura.
4. **Kill switch.** Por workspace e global, com evento de auditoria em cada
   mudança. Desligar a IA não pode derrubar o produto: toda superfície de IA
   tem caminho degradado testado.

Mais dois específicos deste domínio:

5. **Sem conselho de investimento personalizado.** O produto analisa, explica e
   organiza. Recomendar aplicação específica é atividade regulada. A instrução
   de sistema declara o limite, a resposta carrega aviso, e existe teste do
   caminho de recusa.
6. **Timeout e captura limitada de erro.** Buffer com teto para a saída de erro
   do provedor, como o buffer de 64 KB do Multica — sem ele o diagnóstico de
   falha é um código de status sem contexto.

## Critério de conclusão

- [ ] Port com adaptador de stub, adaptador Anthropic e adaptador OpenRouter,
      os três passando na mesma suíte de contrato.
- [ ] Teste de recusa sem contexto de workspace.
- [ ] Teste de redação: entrada com nome, e-mail e documento; nada disso
      aparece no payload que sai.
- [ ] Teste de orçamento estourado.
- [ ] Kill switch desliga e o produto continua de pé.
- [ ] Contabilidade de token conferida contra uma chamada real a cada
      provedor - custo por token difere entre Anthropic API e OpenRouter, e
      OpenRouter difere por modelo dentro de si mesmo.
- [ ] Cinco provas negativas de RLS em `ai_runs` e `ai_budgets`.

## Decisões a registrar

Numeração a partir de 030: a Fase 06 já consumiu a 029
([`029-export-streams-the-csv-in-the-response.md`](../../decisions/029-export-streams-the-csv-in-the-response.md)).

| # | Decisão |
| ---: | --- |
| 030 | o provedor de modelo fica atrás de um port; o produto não implementa loop de agente |
| 031 | Anthropic API e OpenRouter entram juntos como os dois adaptadores iniciais, não um-depois-o-outro |
| 032 | dado nível 3 e 4 não sai para provedor externo; sai agregado e referência |
| 033 | toda execução de IA tem orçamento, kill switch e trilha de auditoria |

## Fatias de commit

1. `feat(ai): add the provider port, message taxonomy and stub adapter`
2. `feat(ai): add the anthropic adapter`
3. `feat(ai): add the openrouter adapter`
4. `feat(database): persist ai runs and budgets`
5. `feat(api): add redaction, budget and kill switch guards`
6. `test(ai): add guardrail evidence`

## Registro de sessões

_(a preencher durante a execução)_
