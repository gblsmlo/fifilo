---
name: engineering-refactor
description: Auditar e refatorar uma vertical do twincam ponta a ponta — Core, persistência, API e Web — contra as fronteiras que as decisões fixaram e a forma modelo da feature, sem tocar em comportamento. Use quando a pergunta for "esta vertical segue a arquitetura", "onde as camadas dela vazam", "esta feature está na forma modelo" ou quando uma entrega passada deixou dívida de estrutura. Não use para mudar comportamento, que é decisão do produto construído sobre este starter, para revisar o diff de um PR, que é engineering-review, para só rodar os checks, que é engineering-validation, nem para construir capacidade nova, que é a escada engineering-contract → engineering-persistence → engineering-api → engineering-web.
scope: twincam
fonte: "docs/00-architecture-map.md"
---

# engineering-refactor

> **Fonte desta skill:** [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md),
> que nomeia a fonte ativa de cada fronteira e diz como ela é imposta. As
> fronteiras de pacote são a Decisão 001; a forma interna de uma feature Web é
> a Decisão 007; o ownership de componente é
> [`component-ownership.md`](../../../docs/engineering/component-ownership.md)
> (Decisão 006). Esta skill não reescreve regra — descobre onde a implementação
> saiu dela e encaminha o conserto para quem é dono de cada camada.

---

## Quando usar

Uma vertical já existe e a pergunta é **se ela ainda obedece à arquitetura**.
Refactor de desenvolvimento: move, renomeia, dissolve, extrai e apaga — nunca
muda o que o sistema faz.

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| O comportamento está errado, ambíguo ou ausente | registre a questão em aberto para o produto construído sobre este starter; este starter não decide comportamento de produto |
| Revisar o diff de um PR contra os critérios da casa | [`engineering-review`](../engineering-review/SKILL.md) |
| Só rodar lint, typecheck e testes | [`engineering-validation`](../engineering-validation/SKILL.md) |
| Construir capacidade nova, ou camada que ainda não existe | [`engineering-contract`](../engineering-contract/SKILL.md) → [`engineering-persistence`](../engineering-persistence/SKILL.md) → [`engineering-api`](../engineering-api/SKILL.md) → [`engineering-web`](../engineering-web/SKILL.md), na ordem de [`feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md) |
| Decidir se o trabalho vira uma entrega ou várias | Decisão 016, o portão de decomposição |
| Onde um componente mora e quem pode importá-lo | [`design-system`](../design-system/SKILL.md) |
| Sessão, cookie, guarda de rota ou o guard da API | [`auth`](../auth/SKILL.md) |
| Componente lento já confirmado por medição | `react-component-performance` |

---

## Passo 0 — Travar o escopo antes de abrir arquivo

Escreva, em uma linha cada, antes de tocar em qualquer coisa:

1. **Qual vertical.** Uma. `auth` — a única capacidade do starter — ou a
   capacidade que o produto adicionou. Não "o Web".
2. **Que camadas ela tem hoje.** Nem toda vertical tem as quatro; a ausência é
   dado, não defeito. `auth` tem API (`apps/api/src/features/{auth,users}`),
   Web (`apps/web/src/features/auth`, `apps/web/src/features/users`), contratos
   em `packages/core/src/contracts/{auth,users}.ts` e o pacote `@twincam/auth`.
3. **O que esta refatoração não vai mudar:** comportamento, contrato público,
   estado semântico, permissão, status HTTP.

> **A linha que não se atravessa.** Se a correção exige decidir o que o produto
> deveria fazer, ela não é desta skill. Achado de produto vira registro — a
> questão em aberto para o produto construído sobre este starter — e a
> refatoração segue sem ele. Uma refatoração que muda comportamento deixa de
> ser refatoração e perde o direito de não ter aceite próprio.

Contrato público que precisa mudar é o mesmo caso: para, e volta pela escada de
construção com entrega própria.

---

## Passo 1 — Medir antes de ler código

Este repositório não tem script dedicado de arquitetura: as fronteiras são
impostas pelos `exports` de cada pacote, pela ausência de `@twincam/*` nos
`paths` de `tsconfig.base.json`, por testes de fronteira dentro dos pacotes
onde a regra é barata de afirmar, e por revisão. Rode primeiro o que existe; o
que acusa é achado com endereço, e o que passa você não precisa procurar à mão.

```bash
sh scripts/check-toolchain.sh
bun run typecheck             # resolve só o que os exports publicam
bun run lint:ci
bun run test                  # inclui os testes de fronteira abaixo
```

**Guarde a linha de base da árvore atual, não do HEAD.** Uma auditoria que move
arquivo compara contra o que existia antes de ela começar. Em `apps/web`,
`packages/ui` e `packages/patterns` a suíte roda pelo script do workspace
(`bun test --isolate --timeout 20000`).

### O que a árvore prova hoje

| Fronteira | Fonte | Onde é provada |
| --- | --- | --- |
| Pacote resolve outro só por subpath publicado; sem import de caminho interno | Decisão 001 | `exports` de cada `package.json`; `tsconfig.base.json` sem `paths` para `@twincam/*` |
| `packages/core` sem Elysia, Drizzle, Better Auth ou pacote de infra | Decisão 001 | revisão (checklist Boundaries do PR) |
| Barrel raiz não inicializa runtime: env, database, auth e logger por subpath explícito | Decisão 001 | revisão |
| `@twincam/api` declara todo pacote que importa diretamente | Decisão 001 | `apps/api/src/dependency-contract.test.ts` |
| `@twincam/patterns` não importa feature, core, router nem API; publica por subpath; runtimes como peer | Decisão 006 | `packages/patterns/src/package-boundaries.test.ts` |
| `ui` → `patterns` → `layouts` → `features`, nunca o inverso | Decisão 006 | revisão, [`design-system`](../design-system/SKILL.md) |
| Web importa outra feature só pelo `index.ts` dela | Decisão 007 | revisão |
| Guarda de rota autenticada redireciona só na ausência de sessão | skill `auth` | `apps/web/src/routes/(authenticated)/-route.test.ts` |

O que a árvore **não** prova: coesão, nome, forma interna de pasta, e
duplicação entre camadas de teste. Isso é a varredura do Passo 2.

---

## Passo 2 — Varrer de dentro para fora

A ordem importa: um achado de camada interna muda o que a externa deveria
fazer, e corrigir de fora para dentro produz retrabalho.

| Ordem | Camada | O que procurar | Quem conserta |
| --- | --- | --- | --- |
| 1 | **Core** | tipo escrito à mão paralelo ao schema Zod; contrato derivado de Drizzle; caso de uso recebendo `Request` ou `tx`; regra com dois donos; `.uuid()` ou suposição de forma de id | [`engineering-contract`](../engineering-contract/SKILL.md) · Decisão 002, 012, 014 |
| 2 | **Persistência** | SQL cru onde o builder cobre; `repository.ts` que faz mais que compor; row devolvida como contrato; query tenant-aware sem o contexto da organização | [`engineering-persistence`](../engineering-persistence/SKILL.md) · Decisão 003, 004 |
| 3 | **API** | schema no corpo do handler em vez de `options`; envelope de erro divergente de `libs/http-errors.ts`; `derive` `scoped` que devia ser `local`; guard retornando `status(...)` em vez de lançar `ActorRejectionError`; rota montando workflow | [`engineering-api`](../engineering-api/SKILL.md) · Decisão 005 |
| 4 | **Web** | rota gorda; page fora de `pages/`; `fetch` literal em vez do `api` de `@libs/api-client`; `components/` conhecendo o router; grupo vazio ou especulativo | [`engineering-web`](../engineering-web/SKILL.md) · Decisão 007, 013 |
| 5 | **Componente** | neutro nascido na feature; cópia ou wrapper que só renomeia; import por caminho interno de `packages/*`; estado de superfície redeclarado | [`design-system`](../design-system/SKILL.md) |
| 6 | **Teste** | mesma afirmação em `.test.tsx` e em story com `play`; teste que nunca roda; story fora de `apps/storybook/src/stories/<camada>` | [`engineering-validation`](../engineering-validation/SKILL.md) · `teste-review` |

Para o **como** de cada linguagem, a fase roteia: `react-review`,
`drizzle-review`, `http-review`, `elysia-diagnose`, `bun-test-review`,
`playwright-review`.

---

## Passo 3 — Sinais de deriva estrutural

Cada item traz o **sinal** que o denuncia e o destino do conserto.

1. **Funcionalidade alheia dentro da feature.** Sinal: uma page cuja rota e
   entrada de navegação não pertencem à capacidade. Funcionalidade define a
   feature; o dado que ela lê, não (Decisão 007). Correção: extrair para
   feature própria, importando a origem só pelo `index.ts` dela.
2. **Diretório de topo fora da forma.** Sinal: pasta que a Decisão 007 não
   prevê, especialmente com subpasta de um arquivo só. Correção: dissolver no
   lugar previsto (`http/`, `hooks/`, `pages/`, `components/`, `schemas/`,
   `utils/`, `storybook/`).
3. **Grupo vazio ou especulativo.** Não crie `dialogs/`, `tables/` ou qualquer
   pasta sem duas peças reais da mesma família. O inverso também conta:
   componente solto que já forma família clara ganha grupo.
4. **Fixture de story na árvore de produção.** Fixture consumida por catálogo e
   teste vive em `storybook/` da feature, como
   `apps/web/src/features/auth/storybook/auth-story-fixtures.ts`.
5. **Código morto × implementação esperando superfície.** Zero consumidores e
   zero testes: apague. Testado, sem superfície ainda: fica, e vira registro da
   questão em aberto para o produto. Distinguir os dois **antes** de apagar.
6. **Literal de caminho dentro de teste.** Testes de fronteira e de rota
   carregam caminho e alias literais (`@features/`, `@web/`). Toda auditoria
   que move arquivo atualiza os literais na mesma entrega — um literal
   desatualizado passa em silêncio e deixa de significar qualquer coisa.
7. **`mock.module` com caminho relativo quebra calado ao mover.** O módulo real
   carrega e o sintoma vira erro de rede no teste, não erro de resolução. Ao
   cruzar feature, mocke pelo alias público (`@features/<x>`, `@libs/<x>`).
8. **Suíte sem `--isolate` mente.** Em `apps/web`, `packages/ui` e
   `packages/patterns` o comando é `bun test --isolate --timeout 20000`; sem
   isolamento o `mock.module` vaza entre arquivos e produz dezenas de falhas
   falsas.

---

## Passo 4 — Mover antes de editar

1. **Movimento primeiro, num commit ou numa leva só**, com `git mv`. Mover e
   editar juntos apaga a detecção de rename e o histórico do arquivo.
2. **Consumidores e literais na mesma leva.** Import, alias, `mock.module`,
   caminho em teste, entrada de `index.ts`, story em `apps/storybook`.
3. **Uma vertical por PR.** Auditoria de duas verticais no mesmo diff não tem
   como ser revisada contra a régua.
4. **Rode a linha de base de novo** e compare com a do Passo 1. Falha nova é
   sua; falha que já existia é registro, não escopo.

Achado que exige migração ampla vira entrega própria em vez de inchar a atual;
a régua de quando isso é uma entrega ou várias é a Decisão 016.

---

## Passo 5 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | Uma vertical só, nomeada no Passo 0 | esta skill |
| 2 | Nenhum comportamento, contrato público, permissão ou status HTTP mudou | esta skill |
| 3 | Achado de produto foi registrado como questão em aberto, não resolvido aqui | esta skill |
| 4 | `typecheck`, `lint:ci` e `test` verdes, com os testes de fronteira dentro | Decisão 001, 006 |
| 5 | Suíte dos workspaces com DOM rodada pelo script do workspace, com `--isolate` | `test-plan.md` § 2 |
| 6 | Movimentos feitos com `git mv`, separados das edições | esta skill |
| 7 | Literais de caminho e alias em testes atualizados | esta skill |
| 8 | Nenhuma pasta nova sem duas peças reais | Decisão 007 |
| 9 | Nenhum export morto deixado sem registro | esta skill |
| 10 | Cobertura dupla entre `bun test` e story com `play` resolvida ou registrada | Decisão 008, 009 |
| 11 | Import entre features só pelo `index.ts`; entre pacotes só por subpath publicado | Decisão 001, 007 |
| 12 | Linha de base comparada contra a árvore de antes, não contra o HEAD | esta skill |

---

## Exemplo

Vertical: **Auth**. O Passo 1 devolve `typecheck` e `test` verdes — nenhuma
fronteira executável quebrada.

**Passo 2, camada 1.** Suponha um tipo `CurrentUser` escrito à mão em
`packages/core` ao lado de `currentUserResponseSchema`. Achado de contrato
(Decisão 012), não de fronteira; encaminha para `engineering-contract`, e o
conserto é interno — o tipo passa a inferir do schema e o consumidor não muda.

**Camada 3.** Suponha uma rota em `apps/api/src/features/users` que transforma
`actorContext` em dado próprio num `derive` sem `{ as: 'local' }`. A Decisão
005 fixa o destino; `engineering-api` conserta, e `elysia-diagnose` mostra o
vazamento entre módulos.

**Camada 4.** Suponha `apps/web/src/features/organizations` importando
`apps/web/src/features/auth/utils/redirect.ts` por caminho interno em vez do
`index.ts` da feature — Decisão 007. E um `fetch('/api/me')` literal onde o
`api` de `@libs/api-client` já publica a rota — Decisão 013.

**Camada 5.** Um medidor de força de senha desenhado dentro do formulário de
cadastro: a moldura não sabe o que carrega, é shell, e o destino é
`@twincam/patterns/password-strength`; a lista de requisitos fica em
`apps/web/src/features/auth/password-requirements.ts`. Encaminha para
[`design-system`](../design-system/SKILL.md).

**A linha do Passo 0.** No caminho aparece que a tela exige um requisito de
senha que ninguém decidiu. **Não é escopo.** Vira registro da questão em aberto
para o produto construído sobre este starter, e a refatoração continua sem
tocar naquela regra.

**Passo 4.** `git mv` numa leva; consumidores, `mock.module` por alias e o
literal de caminho em `-route.test.ts` na mesma leva.
`bun --filter @twincam/web test` comparado com a baseline do Passo 1: mesmas
falhas, nenhuma nova.

---

## Antipadrões

| Antipadrão |
| --- |
| Auditar "o Web" em vez de uma vertical |
| Corrigir comportamento junto, porque "já estava ali" |
| Resolver achado de produto para não interromper o fluxo |
| Começar pela camada externa e refazer depois |
| Mover e editar no mesmo commit, apagando a detecção de rename |
| Apagar export sem separar código morto de implementação sem superfície |
| Criar pasta para uma peça só, antecipando a segunda |
| Deixar literal de caminho ou alias desatualizado num teste |
| Comparar a suíte contra o HEAD em vez da árvore de antes |
| Rodar a suíte de `apps/web` sem `--isolate` e acreditar nas falhas |
| Duas verticais no mesmo PR |
| Chamar de refatoração o que muda contrato público ou status HTTP |

---

## Passo 6 — Fechar

1. **Passe o bastão.** A validação proporcional é
   [`engineering-validation`](../engineering-validation/SKILL.md); a revisão
   antes do PR é [`engineering-review`](../engineering-review/SKILL.md).
2. **Dívida que sobrou se registra com dono e condição de fechamento**, não se
   arrasta em silêncio.
3. **Fronteira em disputa vira decisão.** Se a auditoria revela que a regra é
   que está errada — e não a implementação —, o destino é uma decisão em
   `docs/decisions/`, citada por número, não uma exceção local.

---

## Relacionados

- [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md) — a fonte, e como cada fronteira é imposta
- [`docs/engineering/component-ownership.md`](../../../docs/engineering/component-ownership.md) — as cinco camadas de componente
- [`docs/engineering/test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1 — uma camada por comportamento
- [`docs/engineering/feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md) — a ordem de uma fatia vertical nova
- [`engineering-validation`](../engineering-validation/SKILL.md) · [`engineering-review`](../engineering-review/SKILL.md) · [`design-system`](../design-system/SKILL.md) · [`auth`](../auth/SKILL.md)
- [`engineering-contract`](../engineering-contract/SKILL.md) · [`engineering-persistence`](../engineering-persistence/SKILL.md) · [`engineering-api`](../engineering-api/SKILL.md) · [`engineering-web`](../engineering-web/SKILL.md) — quem conserta cada camada
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; 001, 003, 005, 006, 007, 009, 013 e 014 são as mais citadas numa auditoria
