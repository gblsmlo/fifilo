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

- [ ] Tabela de casos de ciclo (fevereiro, dia do fechamento, vencimento antes
      do fechamento, retroativo) coberta por teste.
- [ ] Teste de propriedade do rateio.
- [ ] Pagar a fatura duas vezes com a mesma chave produz um pagamento.
- [ ] Despesa no cartão não move o saldo em caixa — teste explícito.
- [ ] Cinco provas negativas de RLS nas três tabelas.
- [ ] E2E: cadastrar cartão → compra parcelada em 3 → fechar fatura → pagar →
      conferir saldo da conta e limite disponível.

## Fatias de commit

1. `feat(core): add credit card cycle, invoice and installment rules`
2. `feat(database): persist credit card details, invoices and installment plans`
3. `feat(api): expose credit card and invoice endpoints`
4. `feat(web): add the credit card and invoice journey`
5. `test(credit-cards): add cycle, allocation and idempotency evidence`

## Registro de sessões

_(a preencher durante a execução)_
