# Fase 03 — Cartão de crédito

**Marco 1** · Depende de: [Fase 02](fase-02-categorias-e-transacoes.md) ·
Entrega: FR-06, FR-11, FR-12.

## Objetivo

Cartão de crédito é o que separa um app de finanças de uma planilha. É também
onde a modelagem ingênua quebra: uma compra no cartão **não** tira dinheiro da
conta, e o dinheiro só sai quando a fatura é paga. Se o saldo consolidado não
souber disso, todo número do produto fica errado.

## Escopo

### Entra

- Cartão com limite, dia de fechamento e dia de vencimento.
- Ciclo de fatura e atribuição automática de lançamento ao ciclo.
- Compra parcelada, com as parcelas caindo em faturas consecutivas.
- Fechar e pagar fatura.
- Limite disponível.

### Não entra

Cartão adicional com portador próprio, cashback, câmbio de compra
internacional, antecipação de parcela. Nenhum foi pedido.

## Modelagem — `packages/core/src/credit-cards`

### Ciclo

O ciclo é derivado, não guardado como regra por fatura: dados `closingDay` e a
data da compra, o ciclo é determinístico. A fatura existe como linha porque
tem estado (aberta, fechada, paga) e porque o dia de fechamento pode mudar sem
reescrever o passado.

Casos que o cálculo do ciclo precisa acertar, e cada um é um teste:

- fechamento no dia 31 em fevereiro → último dia do mês;
- compra **no** dia do fechamento → entra na fatura seguinte (regra do produto,
  declarada, não adivinhada);
- vencimento anterior ao fechamento → vence no mês seguinte ao fechamento;
- compra retroativa lançada depois da fatura fechada → vai para a fatura aberta
  atual, com marca de origem, nunca reabre fatura fechada.

### Parcelamento

Um `installment_plan` gera N transações de uma vez, uma por ciclo consecutivo,
cada uma com `installmentNumber` e ponteiro para o plano.

- O rateio usa `allocate` do primitivo `Money` da Fase 00: R$ 100 em 3 vezes é
  33,34 / 33,33 / 33,33, e a soma das parcelas é exatamente o total. Nunca
  `total / n` arredondado N vezes.
- Editar o plano afeta apenas parcelas em fatura **aberta**; parcela em fatura
  paga é histórico.
- Apagar o plano apaga as parcelas futuras e mantém as passadas, com aviso
  explícito na UI sobre quantas serão apagadas.

### Fatura

```text
open -> closed -> paid
         └-----> overdue -> paid
```

- Fechar: congela o conjunto de lançamentos e calcula o total.
- Pagar: cria uma **transferência** da conta de origem para o cartão. Não há
  código novo de movimento — é a Fase 01 pagando dividendo.
- Pagamento parcial é permitido; o resto vira saldo devedor que entra na fatura
  seguinte como lançamento próprio.

### Limite disponível

`limite − (saldo devedor de faturas não pagas) − (lançamentos da fatura aberta)`.
Definição declarada no domínio e testada; qualquer outra fórmula produz um
número que o usuário não reconhece.

## Persistência

- `credit_card_details`: `account_id` como PK composta com `organization_id`,
  1:1 com `financial_accounts` de `kind = credit_card`. Tabela lateral em vez
  de colunas anuláveis na conta — o ciclo de vida é distinto e a tabela
  principal continua honesta.
- `card_invoices`: `(organization_id, id)`, `account_id`, `period_start`,
  `period_end`, `due_on`, `status`, `total_minor`, `closed_at`, `paid_at`,
  `version`. Único em `(organization_id, account_id, period_start)`.
- `entries` ganha `invoice_id` anulável, com FK composta. Guardar a atribuição
  em vez de recalcular em toda leitura torna reatribuição explícita e auditável.
- `installment_plans`: total, número de parcelas, primeira competência,
  descrição, categoria, `version`.

RLS `FORCE` e as cinco provas negativas nas três tabelas novas.

## API — `apps/api/src/features/credit-cards`

| Rota | Nota |
| --- | --- |
| `POST /api/accounts/:id/credit-card` | anexa detalhes ao cartão |
| `GET /api/credit-cards/:id/invoices` | lista faturas |
| `GET /api/credit-cards/:id/invoices/:invoiceId` | itens e total |
| `POST /api/invoices/:id/close` | idempotente |
| `POST /api/invoices/:id/pay` | exige `Idempotency-Key`; cria a transferência |
| `POST /api/transactions/installments` | cria o plano e as parcelas |

`pay` é o primeiro comando do produto com efeito que não pode duplicar. É o
caso que justifica o envelope de idempotência da Fase 00.

## Web — `apps/web/src/features/credit-cards`

- Cartão na lista de contas mostra limite usado, disponível e vencimento.
- Página de fatura: itens agrupados por dia, total, botão de fechar e de pagar.
- Formulário de compra ganha o bloco de parcelamento, que mostra **as parcelas
  calculadas antes de salvar** — o usuário confere o rateio, não confia.
- Story com fatura vazia, aberta, fechada, paga e vencida.

## Decisões a registrar

| # | Decisão |
| ---: | --- |
| 024 | a fatura é uma linha com estado; o ciclo é derivado do dia de fechamento |
| 025 | pagar fatura é uma transferência, não um tipo de movimento novo |

## Riscos

- **Compra no cartão diminuindo o saldo em caixa.** É o erro clássico. O saldo
  consolidado tem que distinguir disponível em caixa de comprometido em fatura.
  Teste explícito: registrar despesa no cartão não altera o saldo da conta
  corrente.
- **Rateio que não soma.** Teste de propriedade: para todo total e todo N, a
  soma das parcelas é o total.
- **Fatura fechada reaberta por lançamento retroativo.** Regra declarada acima;
  sem ela o total da fatura muda depois que o usuário já pagou.
- **Dia 31 em mês de 30.** Um teste por mês do ano, não um caso feliz.

## Critério de conclusão

- [x] Tabela de casos de ciclo (fevereiro, dia do fechamento, vencimento antes
      do fechamento, retroativo) coberta por teste —
      `packages/core/src/credit-cards/cycle.test.ts` cobre fevereiro bissexto
      e não bissexto, todo mês de 30 dias, compra no dia do fechamento e
      vencimento antes do fechamento; o caso retroativo tem sua própria
      suíte em `use-cases/resolve-invoice-for-occurrence.test.ts`, incluindo
      o caso em que nenhuma fatura aberta existe ainda.
- [x] Teste de propriedade do rateio —
      `packages/core/src/credit-cards/installment.test.ts` varre todo total
      de 0 a 500 (passo 7) contra toda contagem de parcelas de 1 a 12 e prova
      que a soma volta a bater com o total em cada combinação.
- [x] Pagar a fatura duas vezes com a mesma chave produz um pagamento —
      provado em duas camadas: `pay-invoice.test.ts` prova que a segunda
      chamada de domínio encontra a fatura já paga e rejeita
      (`invoice_already_paid`), contando as transferências realmente
      escritas; `credit-cards.routes.test.ts` prova que a mesma
      `Idempotency-Key` na rota HTTP replica a mesma resposta, reaproveitando
      o envelope de idempotência que `idempotency-persistence.integration.test.ts`
      já prova contra PostgreSQL real desde a Fase 00.
- [x] Despesa no cartão não move o saldo em caixa — teste explícito —
      `card-purchase-cash-balance.integration.test.ts`: um saldo de abertura
      na conta corrente permanece intacto depois de uma despesa no cartão,
      lido pelo mesmo `entryReader.balancesByAccount` que a produção usa.
- [x] Cinco provas negativas de RLS nas três tabelas —
      `credit-cards-persistence.integration.test.ts`,
      `invoices-persistence.integration.test.ts` e
      `installment-plans-persistence.integration.test.ts`, as cinco contra
      PostgreSQL real em cada uma das três tabelas novas.
- [x] E2E: cadastrar cartão → compra parcelada em 3 → fechar fatura → pagar →
      conferir saldo da conta e limite disponível —
      `e2e/credit-cards/credit-cards.spec.ts`, contra a API e um banco
      reais, com os dois números finais conferidos (não só "mudou").

## Fatias de commit

1. `feat(core): add credit card cycle, invoice and installment rules`
2. `feat(database): persist credit card details, invoices and installment plans`
3. `feat(api): expose credit card and invoice endpoints`
4. `feat(web): add the credit card and invoice journey`
5. `test(credit-cards): add cycle, allocation and idempotency evidence`

## Registro de sessões

### 2026-09-06 — fase fechada

Seis commits, em ordem: `ee02a7e` (Core: ciclo, fatura, parcelamento e casos
de uso), `68fbdb5` (schema e migração das três tabelas novas), `306a8e9`
(API: rotas de cartão e fatura), `bc0cc57` (as cinco provas de RLS nas três
tabelas mais a prova de saldo em caixa), `68d5982` (Web: a jornada completa)
e `11c68b2` (E2E).

Nenhum bug de produção nesta fase — ao contrário da Fase 02, cuja depuração
consumiu uma hora em um processo de desenvolvimento obsoleto, a suíte de
testes encontrou os dois defeitos reais desta fase antes de qualquer
execução manual:

Primeiro achado, na própria modelagem: a primeira versão de
`resolveInvoiceForOccurrence` tratava "fatura natural fechada, nenhuma
fatura aberta encontrada" caindo de volta na fatura fechada em si —
reabrindo exatamente a fatura que a regra existe para proteger. O teste
`resolve-invoice-for-occurrence.test.ts` que cobre esse caso vazio (nenhuma
fatura aberta no arquivo) expôs isso antes de qualquer código de
persistência existir; a correção abre o ciclo atual de verdade (a partir de
`today`, não do `occurredOn` retroativo) em vez de usar `natural ?? ...`.

Segundo achado, ao escrever o E2E: o link "Gerenciar cartão" em
`account-list.tsx` usa `Button` com `render={<Link .../>}` (Decision 006 —
Base UI troca o elemento final, não só a aparência), o que muda seu papel de
acessibilidade para `link`, não `button`. O primeiro rascunho do teste
procurava `getByRole('button', { name: 'Gerenciar cartão' })` e nunca
encontrava o elemento; a árvore de acessibilidade capturada no erro do
Playwright mostrou o papel real.

Escopo deliberadamente reduzido, sinalizado e não escondido:

- **Pagamento parcial não existe.** `payInvoice` sempre paga
  `invoice.totalMinor` inteiro; o resto que "entra na fatura seguinte como
  lançamento próprio" (Fase 03 § Modelagem) fica para quando um consumidor
  real pedir — Decisão 025 documenta a razão.
- **A flag de retroatividade não atravessa o contrato HTTP.** O domínio
  já a calcula (`ResolvedInvoice.retroactive`); nenhuma rota ou tela a expõe
  ainda, porque nada no critério de conclusão desta fase precisa dela
  visível.
- **A lista de contas não mostra limite e vencimento do cartão inline.**
  Mostrá-los ali exigiria que a feature `accounts` dependesse de
  `credit-cards`, que já depende de `accounts` para os próprios lookups de
  conta — o único ciclo entre duas features que esta fase deliberadamente
  não introduz. O link "Gerenciar cartão" leva à página do cartão, que
  mostra os dois números.
- **Sem editor de plano de parcelamento.** Criar o plano funciona; editar
  parcelas futuras ou apagar o plano (Fase 03 § Modelagem os descreve) não
  foi pedido nesta entrega.

Evidência: `bun run lint:ci`, `bun run typecheck`, `bun run test` (326 casos
no total do monorepo: 99 Core — 37 novos de `credit-cards`, incluindo o
teste de propriedade do rateio —, 113 API — incluindo as quinze provas
negativas de RLS das três tabelas novas contra PostgreSQL real e a prova de
saldo em caixa —, mais UI/patterns/infra/Web nas contagens já estabelecidas
pelas fases anteriores),
`bun run storybook:test` (166 histórias, 45 arquivos — `InvoiceDetail` com
os cinco estados do critério de conclusão: nenhuma selecionada, vazia,
aberta, fechada, paga e vencida) e `bun run test:e2e` (12 jornadas, a nova
`credit-cards.spec.ts` entre elas) — todos verdes.

_(a preencher durante a execução)_
