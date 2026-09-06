# Fase 06 — Settings, aceitação e entrega

**Marco 1** · Depende de: [Fase 05](fase-05-analytics-e-graficos.md) ·
Entrega: FR-16, FR-17 e o fechamento do Marco 1.

## Objetivo

Fechar o núcleo. Duas metades: as configurações que o produto inteiro já
depende implicitamente, e a auditoria que decide se o Marco 1 realmente
terminou. **É esta fase que abre o portão do Marco 2.**

## Escopo

### Entra

- `workspace_settings`: moeda, locale, fuso, dia de início do mês, início da
  semana.
- `user_preferences`: tema, densidade, preferências de notificação.
- Exportação dos dados do workspace em CSV.
- Auditoria de aceitação de todas as fases contra os requisitos do
  [roadmap](README.md).
- Correção dos achados da auditoria.

### Não entra

Exclusão de conta e de workspace com o fluxo de retenção completo — a
[security.md](../../engineering/security.md) descreve estados que merecem fase
própria, e nada no Marco 1 depende disso.

## Modelagem

### Settings do workspace

Estas configurações **já são usadas** pelas Fases 01–05 com valor implícito.
Esta fase as torna explícitas e editáveis; nenhuma fase anterior deve ter
constante espalhada.

| Campo | Efeito |
| --- | --- |
| `currency` | moeda de toda conta e lançamento |
| `locale` | formatação de número e data no Web |
| `timezone` | resolve "hoje" e "este mês" antes de virar data civil |
| `monthStartDay` | mês financeiro que não começa no dia 1 |
| `weekStartsOn` | agrupamento semanal |

`monthStartDay` diferente de 1 muda **todas** as projeções da Fase 05. Ou a
Fase 05 já recebe o início do mês por parâmetro, ou esta fase reabre as seis
projeções. A primeira opção é mais barata: a Fase 05 recebe duas datas civis, e
quem as calcula é o Web.

Trocar `currency` com lançamento existente é `conflict`. Converter histórico é
outro problema, com taxa e data, e não está no escopo.

### Preferências do usuário

Chave `(user_id, organization_id)`: a mesma pessoa pode preferir coisas
diferentes em workspaces diferentes. Não é tabela de tenant no sentido estrito,
mas leva RLS pelo `organization_id` e filtro adicional por `app.user_id`, que
`applyActorContext` já instala.

### Exportação

CSV de transações com lançamentos, contas, categorias e faturas do período.
Evento de auditoria por exportação. Arquivo gerado com expiração de 24h,
conforme a retenção da `security.md`. Owner e admin exportam; `viewer` não.

## Auditoria de aceitação

O Financy fechou com uma auditoria que achou 4 bloqueadores, 8 defeitos e 8
nits **depois** de todas as fases marcadas como concluídas. O padrão é esperado,
não excepcional: a auditoria é uma fase, não uma formalidade.

Roteiro:

1. Cada FR e NFR do [roadmap](README.md) exercitado contra a API real e no
   navegador — não contra o teste que o autor escreveu.
2. Clone limpo: `git clone`, `bun install`, copiar `.env.example`,
   `docker compose up`, `bun run db:migrate`, `bun run dev`. Qualquer passo
   manual não documentado é bloqueador.
3. Varredura de segredo no histórico antes de qualquer push público.
4. Conferência de que toda tabela de tenant tem as cinco provas negativas.
5. Conferência de que toda rota de escrita tem prova de negação para `viewer`.
6. Achados registrados em `docs/bugs/` com o índice de `BUG-NNN`, classificados
   em bloqueador, defeito e nit.

Cada correção de comportamento é conferida quebrando o código de propósito
primeiro — se o teste passa com a implementação quebrada, ele não prova nada.

## Portão do Marco 2

O Marco 2 não começa enquanto qualquer item abaixo estiver aberto:

- [ ] Todos os FR-01 a FR-18 exercitados e aprovados.
- [ ] Todos os NFR-01 a NFR-10 verificados.
- [ ] Zero bloqueador aberto em `docs/bugs/`.
- [ ] `bun run lint:ci`, `typecheck`, `test`, `storybook:test`, `test:e2e`
      verdes no CI, contra PostgreSQL.
- [ ] `docker compose build` e `bun run build` verdes.
- [ ] Clone limpo sobe sem passo manual não documentado.
- [ ] Decisões 017 a 028 registradas e indexadas.
- [ ] `00-architecture-map.md` atualizado com as capacidades novas.

Motivo do portão: um agente que lê dado errado produz conselho errado com
aparência de confiança. Num produto financeiro esse é o pior resultado
possível, e não existe prompt que conserte.

## Riscos

- **Settings tratada como tela de fim de projeto.** Ela é pré-requisito das
  projeções. Se a Fase 05 assumiu início de mês no dia 1, esta fase reabre a 05.
- **Exportação vazando dado de outro workspace.** É a operação que mais lê de
  uma vez. Teste com duas organizações populadas.
- **Auditoria feita pelo autor sem roteiro.** Vira releitura do próprio código.
  O roteiro acima existe para forçar exercício real.

## Fatias de commit

1. `feat(core): add workspace settings and user preferences`
2. `feat(database): persist settings with tenant policies`
3. `feat(api): expose settings and export endpoints`
4. `feat(web): add the settings journey`
5. `docs: record the milestone 1 acceptance audit`
6. `fix: resolve the acceptance audit findings`

## Registro de sessões

_(a preencher durante a execução)_
