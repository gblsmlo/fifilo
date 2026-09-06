# Fase 05 — Analytics e gráficos

**Marco 1** · Depende de: [Fase 04](fase-04-workspace-compartilhado.md) ·
Entrega: FR-14, FR-15.

## Objetivo

Transformar o histórico em leitura. Esta fase também é a ponte para o Marco 2:
**toda projeção construída aqui vira, sem reescrita, uma ferramenta de agente
na [Fase 08](fase-08-chat-financeiro.md)**. Um agente que consulta projeções
testadas herda autorização, RLS e correção de graça; um agente que escreve SQL
próprio herda nada.

## Escopo

### Entra

- Projeções: fluxo mensal, despesa por categoria, evolução de saldo, saldo
  consolidado, maiores gastos do período, gasto por conta e por cartão.
- Dashboard com o período corrente.
- Biblioteca de gráficos e os componentes de gráfico em `packages/patterns`.

### Não entra

Orçamento, meta, previsão e comparação com período anterior fora do que os
gráficos já mostram. Exportação em CSV/PDF fica para a
[Fase 06](fase-06-settings-e-aceitacao.md). Nada gerado por IA.

## Modelagem — `packages/core/src/analytics`

Cada projeção é um caso de uso com contrato próprio de entrada e saída. Entrada
sempre tem período explícito e nunca assume "hoje" dentro do domínio — o
relógio entra por parâmetro, senão o teste vira refém da data de execução.

| Projeção | Saída |
| --- | --- |
| `monthlyCashflow` | por mês: receita, despesa, líquido |
| `spendByCategory` | por categoria e subcategoria, com percentual do total |
| `balanceEvolution` | saldo acumulado por dia ou mês, por conta e consolidado |
| `consolidatedBalance` | disponível em caixa, comprometido em fatura, líquido |
| `topExpenses` | N maiores despesas do período |
| `spendByAccount` | por conta e por cartão |

Regras:

- Transferência **não** conta como receita nem despesa em nenhuma projeção.
  É o erro que infla os dois lados e destrói a leitura de fluxo. Teste
  dedicado.
- Parcela conta na competência da parcela, não na data da compra.
- O período "este mês" é resolvido no fuso do workspace, no Web, e chega ao
  domínio como duas datas civis.

## Persistência

Consulta, não tabela nova. É aqui que a escolha de Drizzle paga: saldo
acumulado é `sum(...) over (order by occurred_on)`, e a agregação com rollup de
subcategoria é CTE. Ambas são de primeira classe no builder.

```sql
select occurred_on,
       sum(sum(amount_minor)) over (order by occurred_on) as balance_minor
from entries
where organization_id = current_setting('app.workspace_id')
  and account_id = $1
  and occurred_on between $2 and $3
group by occurred_on
```

Nenhuma view materializada nesta fase. Materializar entra com `EXPLAIN
ANALYZE` anexado e migração própria, conforme
[operação](../../engineering/operation.md) — regra 7 dos achados herdados do
Financy.

Toda consulta roda dentro da transação de workspace. SQL cru é a exceção
justificada da Decision 004: função de janela e CTE entram, `where` de tenant
manual não — quem filtra o tenant é a policy.

## API — `apps/api/src/features/analytics`

`GET /api/analytics/<projeção>` com `from`, `to` e filtros próprios na query,
validados por schema. Resposta com formato estável e valores em unidade menor —
formatação é do Web.

Cabeçalho `Cache-Control: private, max-age=0, must-revalidate` e `ETag` por
projeção. Dado financeiro do próprio usuário não vai para cache compartilhado.

## Web — `apps/web/src/features/analytics` e `packages/patterns`

Componente de gráfico é **neutro de domínio** e mora em `packages/patterns`,
com subpath publicado, teste no package e story em `apps/storybook`
(Decision 006). A feature passa dados já projetados; o gráfico não sabe o que é
uma categoria.

Requisitos de cada gráfico:

- legenda, eixo e tooltip com rótulo acessível; cor nunca é o único canal;
- estado vazio, carregando e erro, pelo `StateSurface` de `packages/patterns`;
- contraste conferido em tema claro e escuro;
- tabela equivalente acessível por trás do gráfico, para leitor de tela.

Gráfico depende de layout real — `jsdom` não mede. Portanto a prova é story com
`play` (Decision 009), não `bun test`.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 027 | biblioteca de gráficos, com o critério de escolha registrado |
| 028 | projeção analítica é caso de uso em Core; nenhuma consulta analítica nasce na rota nem no Web |

Sobre a 027: a escolha precisa de React 19, composição por componente,
acessibilidade utilizável e tamanho de bundle aceitável. Recharts atende os
quatro e é a recomendação; a decisão registra a alternativa considerada e o
gatilho para revisitar (gráfico com dezenas de milhares de pontos, que pede
canvas em vez de SVG).

## Riscos

- **Transferência contada como movimento.** Infla receita e despesa
  simultaneamente e o líquido continua certo — por isso passa despercebido.
  Teste que compara um workspace com e sem transferências.
- **Somar na aplicação.** Trazer todas as linhas e reduzir em JavaScript
  funciona com 200 transações e derrete com 20 mil. A agregação é do
  PostgreSQL.
- **Fuso de novo.** A projeção recebe datas civis. Se alguma rota calcular
  "mês atual" no servidor, o defeito 2 do Financy volta por outra porta.
- **Gráfico testado em `jsdom`.** Passa sem renderizar nada. Camada errada.

## Critério de conclusão

- [x] Seis projeções com teste de sucesso e de borda (período vazio, mês sem
      movimento, conta arquivada com histórico). 16 testes de uso de caso em
      `packages/core/src/analytics/use-cases/*.test.ts` (sucesso + range
      invertido) e 10 testes de integração contra PostgreSQL real em
      `apps/api/src/features/analytics/analytics-persistence.integration.test.ts`,
      incluindo os três casos de borda nomeados: período vazio (sem linhas,
      sem erro), mês sem movimento dentro de um range ativo (simplesmente
      ausente, não zero-preenchido) e conta arquivada (`spendByAccount`
      continua reportando seu histórico).
- [x] Teste de que transferência não entra em fluxo nem em gasto por
      categoria. `monthlyCashflow buckets an installment at its own
      competência and never counts a transfer` prova as duas pernas da
      transferência excluídas do fluxo; `spendByCategory sums every expense
      under its category, transfer excluded by construction` prova o mesmo
      para gasto por categoria - ambos contra dados reais que incluem uma
      transferência de propósito.
- [x] Teste de que parcela conta na competência da parcela. Mesmo teste
      acima: duas parcelas de uma compra, uma em janeiro e outra em
      fevereiro, cada uma contada no mês da sua própria `occurredOn`.
- [x] Componentes de gráfico em `packages/patterns` com story e prova de
      a11y. `TrendLineChart` e `RankedBarChart`
      (`packages/patterns/src/charts/*.tsx`), cada um com story em
      `apps/storybook/src/stories/patterns/charts/*.stories.tsx` cobrindo
      `Default`, a tabela `sr-only` por trás do gráfico, `Empty`, `Loading`,
      `Failure` e `LightTheme` - 12 stories, todas com `play`, rodando em
      Chromium real via `storybook:test` (176 stories no total do app, todas
      verdes).
- [x] Dashboard montado e conferido em tema claro e escuro. Nenhuma cor é
      fixa: os dois componentes de gráfico leem `var(--color-chart-N)`,
      `var(--color-border)` e `var(--color-muted-foreground)` (Decision 027),
      então o mesmo componente já é o de ambos os temas - a story
      `LightTheme` de cada gráfico fixa o tema claro via `globals` da
      toolbar e roda a mesma prova de renderização que `Default` (tema
      escuro, o padrão do preview), então o par é conferido em toda execução
      de `storybook:test`, não só manualmente.
- [x] E2E: semear três meses de movimento → abrir dashboard → conferir os
      números contra o esperado calculado à mão.
      `e2e/analytics/analytics.spec.ts`: cria conta e duas categorias
      (receita e despesa), registra receita e despesa em três meses
      diferentes com valores distintos, abre o dashboard no período e
      confere à mão o fluxo mensal por mês, o gasto por categoria e por
      conta somados, a ordem "maior primeiro" de maiores gastos, e o delta
      exato que a jornada soma ao saldo consolidado (a leitura é feita
      contra a API diretamente para o saldo consolidado - ver o registro de
      sessão para o porquê).

## Fatias de commit

1. `feat(core): add analytics projections and contracts`
2. `feat(api): expose analytics endpoints`
3. `feat(patterns): add neutral chart compositions`
4. `feat(web): add the dashboard and analytics journey`
5. `test(analytics): add projection and browser evidence`

## Registro de sessões

### 2026-09-06 — execução completa

Cinco fatias de commit, na ordem do plano, todas com `lint:ci`,
`typecheck`, `bun test` e (nas fatias que tocaram Web/patterns) `storybook:test`
verdes antes de cada commit, mais `test:e2e` completo (14 specs) verde ao
final.

**Core** (`packages/core/src/analytics`): seis casos de uso, cada um
delegando a agregação ao `AnalyticsReader` - a regra "nunca somar em
JavaScript" (Fase 05 § Riscos) é estrutural, não um lembrete: o port só
devolve formas já agregadas. `validateDateRange` roda antes de qualquer
leitura em todos os seis. Achado ao rodar `lint:ci` pela primeira vez: dois
arquivos (`get-monthly-cashflow.ts`, `get-spend-by-category.ts`) importavam
`err` sem nunca chamá-lo - o padrão `if (!range.ok) return range` já
devolve o `Err` tipado, `err()` nunca é necessário nesse ponto. Corrigido
antes do primeiro commit.

**API** (`apps/api/src/features/analytics`): seis rotas `GET`, cada uma
`parse → caso de uso → mapeia o Result`, sem `where` ou `group by` próprio
(Decision 028). `Cache-Control: private, max-age=0, must-revalidate` e um
`ETag` derivado do corpo (`Bun.hash`) em toda resposta. A suíte de
integração prova os dois riscos nomeados contra PostgreSQL real na primeira
tentativa; os três casos de borda extras (período vazio, mês sem
movimento, conta arquivada) foram adicionados na quinta fatia, depois de
fechar o restante da fase.

**Patterns** (`packages/patterns/src/charts`): `TrendLineChart` e
`RankedBarChart` cobrem as seis projeções como duas formas -
"valor por período, uma ou mais séries" e "valor por rótulo, ranqueado".
Recharts 3.10.1 escolhido e registrado como Decision 027; `--chart-1`..
`--chart-5` já existiam tematizados em `apps/web/src/styles/global.css`
desde antes desta fase, nunca usados até agora. Depuração de story
significativa: o seletor `svg.recharts-surface` sozinho pegava o ícone da
legenda (que usa a mesma classe), corrigido com
`svg.recharts-surface:has(.recharts-cartesian-grid)`;
`Line`/`Bar` precisaram de `isAnimationActive={false}` porque a curva SVG
não existe no DOM até a animação de entrada terminar, e a asserção do
`play` roda antes disso. `formatBRL`/`Intl.NumberFormat('pt-BR', ...)`
intercala um espaço non-breaking entre "R$" e o valor no Chromium -
comparações de nome acessível por string literal falham silenciosamente
contra isso; corrigido comparando com a mesma função formatadora, nunca uma
string escrita à mão.

**Web** (`apps/web/src/features/analytics`): substitui o dashboard
placeholder do starter. Cada seção é uma `useQuery` própria, período
default "este mês" via `resolveThisMonthRange` (já existente na feature de
transações, reaproveitado por import entre features - o mesmo padrão que
`transactions-page.tsx` já usa para `accountsQueryOptions`/
`categoriesQueryOptions`). "Maiores gastos" ficou como tabela simples, não
um terceiro tipo de gráfico: "as N maiores linhas" já é a própria forma de
fallback acessível que um gráfico teria.

**E2E**: a parte mais custosa da fase. Três achados, nenhum deles um bug de
produto:

1. O diálogo de transação nunca desmonta entre aberturas (só o `open` do
   Base UI Dialog alterna) - a aba selecionada (`useState` no componente
   pai) sobrevive ao fechamento, então abrir "Receita" uma vez e depois
   confiar na aba default "Despesa" na chamada seguinte falha silenciosamente
   (o formulário errado valida contra a categoria errada). Corrigido
   clicando a aba explicitamente em toda abertura, nunca assumindo o
   default.
2. Um ano fixo no período de teste (`2031`) acumula duplicata a cada
   re-execução: nada neste repositório apaga linha de E2E antiga, e a
   descrição da transação não carregava o `stamp` da execução. Corrigido
   derivando o ano do timestamp da própria execução
   (`2100 + (Date.now() % 500)`), o mesmo argumento que a Fase 04 já tinha
   registrado para a organização semeada compartilhada.
3. "Disponível em caixa" é um saldo corrente calculado *como de uma data*,
   não uma soma restrita ao período do dashboard (é exatamente o contrato
   que Fase 05 § Modelagem pede) - então num banco compartilhado e nunca
   limpo ele carrega a história de toda `spec` que já rodou. A tentativa
   inicial de ler o valor certo direto do card renderizado teve dois
   sintomas: um flake ocasional isolado (resolvido por retry) e uma falha
   consistente de 60s ao rodar a suíte completa (não resolvida por retry) -
   sinal de que não era só timing de render, e sim de que a leitura via DOM
   competia com o próprio ciclo de carregamento da seção vizinha no mesmo
   dashboard. Corrigido lendo o valor direto da API
   (`page.request.get('/api/analytics/consolidated-balance?...')`) antes e
   depois de criar as transações, e comparando o *delta* (sempre
   determinístico) em vez do valor absoluto (que depende de tudo que a
   organização compartilhada já acumulou). A mudança de copy do dashboard
   ("ponto de partida de..." → "painel de...") também quebrou uma asserção
   pré-existente em `organization-onboarding.spec.ts`, atualizada junto.

Suíte completa (`bun run test:e2e --workers=1`): 14 specs, 14 verdes, duas
vezes seguidas antes do commit final.

### Escopo não coberto, de propósito

- Nenhum toggle de tema claro/escuro existe na aplicação Web em si (é gap
  do starter, não desta fase) - a prova de "conferido em tema claro e
  escuro" é feita nos componentes de gráfico via Storybook, que já tem o
  alternador; a Fase 06 (Settings) é o lugar natural para um toggle de
  verdade, se o produto pedir um.
- `spendByCategory` não expõe um alternador de `kind` no dashboard: a seção
  Web fixa `kind: 'expense'` (gasto, não receita) porque é a leitura mais
  comum de "gasto por categoria"; a rota e o caso de uso já aceitam
  `'income'` também, então adicionar o alternador depois é um componente,
  não uma mudança de contrato.
