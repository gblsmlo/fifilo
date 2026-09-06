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

- [ ] Seis projeções com teste de sucesso e de borda (período vazio, mês sem
      movimento, conta arquivada com histórico).
- [ ] Teste de que transferência não entra em fluxo nem em gasto por categoria.
- [ ] Teste de que parcela conta na competência da parcela.
- [ ] Componentes de gráfico em `packages/patterns` com story e prova de a11y.
- [ ] Dashboard montado e conferido em tema claro e escuro.
- [ ] E2E: semear três meses de movimento → abrir dashboard → conferir os
      números contra o esperado calculado à mão.

## Fatias de commit

1. `feat(core): add analytics projections and contracts`
2. `feat(api): expose analytics endpoints`
3. `feat(patterns): add neutral chart compositions`
4. `feat(web): add the dashboard and analytics journey`
5. `test(analytics): add projection and browser evidence`

## Registro de sessões

_(a preencher durante a execução)_
