---
name: design-system
description: Decidir onde um componente do fifilo mora e quem pode importá-lo — a régua shell × vitrine, a escada `packages/ui` → `packages/patterns` → `apps/web/src/layouts` → `features/<x>`, a forma container + `*FormFields` de um formulário, e a obrigação de story como teste — citando as Decisões 006, 007, 009, 010 e 011. Use quando a pergunta for "isto vira pattern ou fica na feature", "posso envolver este componente do @fifilo/ui", "onde entra a story", "este shell já existe" ou "como separar o formulário da superfície que a story monta". Não use para escrever o componente com os primitivos Base UI, que é coss, para a story em si, que é storybook-story, nem para o formulário com validação, que é react-hook-form.
scope: fifilo
fonte: "Decisão 006"
---

# design-system

> **Fonte desta skill:** Decisão 006, que fixa a escada de ownership e a régua
> shell × vitrine. Decisão 007 fixa a forma interna de uma feature, inclusive a
> dupla container + `*FormFields`; Decisão 009 faz de `apps/storybook` uma
> camada de teste; Decisão 010 ordena o catálogo pelo diretório; Decisão 011
> declara controle por `argTypes`. A tabela de camadas mora em
> [`docs/engineering/component-ownership.md`](../../../docs/engineering/component-ownership.md).
> Esta skill não repete o texto das decisões — diz o que decidir e em que
> ordem.

---

## Quando usar

Existe um componente a criar, mover ou revisar, e a pergunta é **onde ele mora**
e **quem pode importá-lo**.

**Quando NÃO usar:**

| Situação | Onde ir |
| --- | --- |
| Escrever o componente com os primitivos Base UI de `@fifilo/ui` | `coss` · `react-developer` |
| Escrever ou revisar a story, ou o teste dentro dela | `storybook-story` · `storybook-test` · `storybook-setup` |
| Escrever o schema Zod e o hook do formulário em si | `react-hook-form` · `zod-validation-expert` |
| Rota fina, loader, search params, page provider | [`engineering-web`](../engineering-web/SKILL.md) |
| Auditar a vertical inteira contra as fronteiras, sem mudar comportamento | [`engineering-refactor`](../engineering-refactor/SKILL.md) |
| Revisar o diff de um PR | [`engineering-review`](../engineering-review/SKILL.md) |
| A fronteira em disputa é de contexto ou de contrato, não de componente | decisão registrada em `docs/decisions/`, citada por número |

---

## Carregamento mínimo

| Ordem | Carregar | Por quê |
| --- | --- | --- |
| 1 | Decisão 006 | a escada e a régua shell × vitrine |
| 2 | [`component-ownership.md`](../../../docs/engineering/component-ownership.md) | o mapa das cinco camadas, mantido contra o workspace |
| 3 | Os `exports` de `packages/ui/package.json` e `packages/patterns/package.json` | o shell pode já existir |
| 4 | Decisão 007 | havendo formulário ou diálogo a posicionar dentro da feature |
| 5 | Decisão 009 · 010 · 011 | a story que a camada exige, onde ela mora, e como declara controle |

**Nunca decida por contagem de consumidor.** Um componente neutro é
compartilhável antes do segundo uso; um componente com vocabulário de domínio
continua da feature mesmo aparecendo em cinco páginas (Decisão 006). O que
exige segundo consumidor é generalizar a API de um shell, não criá-lo.

---

## Passo 1 — A régua: shell ou vitrine

```
Este componente sabe O QUE carrega?
├── NÃO — sabe posição, hierarquia, densidade, estado visual e semântica de a11y,
│         recebe conteúdo e callbacks, não conhece rota, mutação, cache,
│         autorização nem vocabulário de domínio
│         → é SHELL → packages/ui ou packages/patterns
└── SIM — sabe quais campos, qual cópia, qual regra, qual mutação,
          qual permissão
          → é VITRINE → apps/web/src/features/<feature>
```

**Uma vitrine compõe shells.** Ela não redesenha moldura e não redeclara estado.
Quando a vitrine está reescrevendo trinta linhas de moldura para variar duas
frases, o shell está faltando no package — não sobrando na feature.

---

## Passo 2 — A escada

| Camada | Responsabilidade | Teste | Story |
| --- | --- | --- | --- |
| `packages/ui/src/components` | primitivo visual reutilizável e neutro de domínio (`Button`, `Field`, `Dialog`, `Empty`, `Spinner`) | junto da implementação, `bun test --isolate --timeout 20000`, só lógica sem DOM real | `apps/storybook/src/stories/ui` (`titlePrefix` `UI`) |
| `packages/patterns/src` | composição reutilizável e neutra, com contrato visual ou de interação estável (`StateSurface`, `Dialog` shell, `ConfirmDialog`, `DestructiveDialog`, `PasswordStrength`, `SettingsRow`) | junto da implementação, mesmo comando | `apps/storybook/src/stories/patterns` (`Patterns`) |
| `apps/web/src/layouts` | shell global acoplado a router, sessão, navegação ou chrome do app (`AppLayout`, `AppHeader`, `AppSidebar`, `NavUser`, `AppAuthLayout`) | no app | `apps/storybook/src/stories/layouts` (`Layout`) |
| `apps/web/src/components` | estrutura de página exclusiva da aplicação Web (`Page`, `PasswordField`) | no app | — |
| `apps/web/src/features/<feature>` | UI com vocabulário, dado ou comportamento de uma capacidade (`SignInFormFields`) | na feature, `bun test --isolate --timeout 20000` | `apps/storybook/src/stories/features/<feature>` (`Features`) quando a vitrine tem estado que precisa de navegador; a página composta, em `stories/pages` (`Pages`) |

**`apps/web/src/components` não é uma segunda biblioteca de UI.** Componente
neutro que aparece ali é achado: ou sobe para o package, ou ganha uma
responsabilidade da aplicação que justifique ficar.

**Todo componente de `packages/*` é consumido por export público explícito**:
`@fifilo/ui/components/<name>`, `@fifilo/ui/lib/utils`,
`@fifilo/patterns/<subpath>`. `packages/ui` não tem barrel raiz. Import por
caminho interno é achado, e `packages/patterns/src/package-boundaries.test.ts`
prova a direção da escada.

---

## Passo 3 — O que o Web nunca faz

- **Não copia** componente neutro do `@fifilo/ui`.
- **Não cria alias visual** que só renomeia.
- **Não envolve** em wrapper sem acrescentar responsabilidade da aplicação —
  integração com router, sessão, autorização, dados ou regra de apresentação do
  domínio. Wrapper que só repassa props é a cópia disfarçada.
- **Não lê a rota dentro de um componente montado em story.** Um shell recebe
  o link pronto ou o callback por prop.

---

## Passo 4 — Estado não se redeclara

O vocabulário de estado de superfície é `StateSurfaceKind` / `SurfaceGuardState`
em `@fifilo/patterns/state-kinds`
([`packages/patterns/src/state-kinds.ts`](../../../packages/patterns/src/state-kinds.ts)):
`loading` e `data` como estados do guard, e os kinds de superfície (`empty`,
`error`, `permission`, …). `errorCodeToSurfaceKind` traduz código de erro em
kind.

A feature carrega o **dado** de cada estado; ela não inventa os nomes de novo,
e a story dela não documenta os estados que `Patterns/StateSurface` já é
autoridade visual de documentar.

---

## Passo 5 — A story é o teste

**`apps/storybook` não é catálogo** (Decisão 009). É a camada de teste de
componente — a única que roda em navegador de verdade fora do E2E — e a fonte
única dos estados que o componente precisa sobreviver. Roda com
`bun run storybook:test` (`@storybook/addon-vitest`, Chromium headless).

- **Story é obrigação de quem publica em `packages/*`**, não cortesia. Primitivo
  ou pattern sem story é entrega **sem teste de componente**, não entrega sem
  documentação.
- **Uma camada por comportamento.** Estado que depende de layout, foco, portal,
  pointer ou a11y se afirma na story com `play`; lógica sem DOM real se afirma
  em `bun test`. Escrever os dois para a mesma afirmação é achado — a régua está
  em [`test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1.
- **O grupo do catálogo vem do diretório, não do `title:`.** `main.ts` aplica
  `titlePrefix` por diretório (`ui` → `UI`, `patterns` → `Patterns`,
  `features` → `Features`, `layouts` → `Layout`, `pages` → `Pages`) e o
  `title:` da story guarda só a folha. A escada é a Decisão 010 — o catálogo é
  consequência de ter as stories, não o motivo delas.
- **Controle se declara por `argTypes`** (Decisão 011); os compartilhados moram
  em `apps/storybook/src/test-utils/story-arg-types.ts`.
- **JSDoc em prop pública de design system é a exceção prescrita** à regra de
  comentários: o autodocs consome aquele texto como fonte, e duplicá-lo em
  `argTypes` cria segunda fonte.
- **Uma story nova não adiciona violação de a11y.** A baseline é
  `A11Y_BASELINE_RULES` em `apps/storybook/src/test-utils/a11y.ts`.
- **Diálogo tem contrato de foco.** `assertDialogFocusContract` em
  `test-utils/dialog-focus-contract.tsx` é a afirmação que toda story de
  diálogo faz.

Escrever a story em si é `storybook-story`; o teste dentro dela é
`storybook-test`; instalar ou reconfigurar o Storybook é `storybook-setup`.

---

## Passo 6 — Formulário: container + `*FormFields`

Existe formulário com Zod e React Hook Form dentro de uma feature, e a pergunta
é o que a story monta (Decisão 007). Um formulário publica **duas superfícies**
no mesmo arquivo `components/forms/<nome>-form.tsx`:

```
SignInForm            → o container: chama o hook (`hooks/use-sign-in-form.ts`),
                        é dono de rede, navegação e toast, e envolve a
                        superfície num `FormProvider`.
SignInFormFields      → a superfície apresentacional: lê o contexto do
                        formulário, valida pelo schema (`schemas/sign-in-form.ts`)
                        e delega ao `onSubmit`. Não conhece rede.
```

**A story monta a segunda.** `apps/storybook/src/stories/features/auth/components/forms/sign-in-form.stories.tsx`
declara `component: SignInFormFields`, monta o `useForm` com o mesmo
`zodResolver`, dirige o `onSubmit` (pendente, recusado, aceito) e afirma o
toast que `feedback.ts` publica. Rota e moldura vêm dos decorators
`withAuthRoute` e `withAuthSurface` em `apps/storybook/src/test-utils/`; os
dados vêm de `apps/web/src/features/auth/storybook/auth-story-fixtures.ts`,
fora da árvore de produção.

**Não corte um `-surface.tsx` só para a story reaproveitar.** As duas
superfícies já existem no arquivo do formulário; um terceiro arquivo é a
duplicação que a Decisão 007 fecha.

**Toda peça da família Dialog vem de Patterns.** `Dialog` e `DialogClose` de
`@fifilo/patterns/dialog`, `ConfirmDialog` de
`@fifilo/patterns/confirm-dialog`, `DestructiveDialog` de
`@fifilo/patterns/destructive-dialog`. Import de
`@fifilo/ui/components/dialog` numa feature é achado quando Patterns já
publica a peça equivalente. Um diálogo da feature mora em
`components/dialogs/` só quando há duas peças reais (Decisão 007).

---

## Passo 7 — Autoverificação

| # | Confira | Fonte |
| --- | --- | --- |
| 1 | Shell não conhece rota, mutação, cache, autorização nem vocabulário de domínio | 006 |
| 2 | Vitrine compõe shell; não redesenha moldura | 006 |
| 3 | A camada escolhida bate com a tabela de ownership | 006 |
| 4 | Nenhuma cópia, alias ou wrapper que só renomeia componente do `@fifilo/ui` | 006 |
| 5 | Consumo por subpath público (`@fifilo/ui/components/<name>`, `@fifilo/patterns/<subpath>`), não por caminho interno | 001, 006 |
| 6 | Estado de superfície usa `@fifilo/patterns/state-kinds`, sem redeclaração | 006 |
| 7 | Componente novo em `packages/*` tem story em `apps/storybook/src/stories/<camada>`, e ela afirma alguma coisa | 006, 009 |
| 8 | O `title:` guarda só a folha; o grupo vem do diretório | 010 |
| 9 | Controle declarado por `argTypes`; descrição no JSDoc da prop | 011 |
| 10 | `apps/web/src/components` não ganhou componente neutro | 006 |
| 11 | Formulário publica container + `*FormFields` no mesmo arquivo; a story monta `*FormFields` | 007 |
| 12 | Fixture da story em `storybook/` da feature, não na árvore de produção | 007 |
| 13 | Família Dialog vem de `@fifilo/patterns/{dialog,confirm-dialog,destructive-dialog}`, não de `@fifilo/ui/components/dialog` | 006 |
| 14 | Nenhuma afirmação repetida entre `.test.tsx` e story com `play` | 008, 009 |

---

## Exemplo

Tarefa: *"o cadastro mostra a força da senha com a lista de requisitos, e a
redefinição de senha vai precisar do mesmo medidor"*.

**Passo 1 — a régua.** O que varia entre as duas telas é a lista de requisitos
e a cópia de cada linha. O que se repete é a barra, a contagem de requisitos
atendidos, o `aria-label` e a semântica de a11y — nada disso sabe o que
carrega. **É shell.**

**Passo 2 — a camada.** Composição reutilizável, neutra, com contrato de
interação estável → `packages/patterns`, exportado como
`@fifilo/patterns/password-strength`. Recebe `requirements: readonly
PasswordRequirement[]` (`label`, `met`) e `ariaLabel`. Não é primitivo (compõe
outros), e não é da feature (não tem vocabulário de domínio).

**Passo 3 — o que fica na feature.** A regra mora em
`apps/web/src/features/auth/password-requirements.ts`: `PASSWORD_MIN_LENGTH` e
`passwordRequirements(password)` produzem a lista; `SignUpFormFields` e
`ResetPasswordFormFields` entregam a lista ao shell. Nenhuma monta a barra à
mão. O campo com alternância de visibilidade é `PasswordField` em
`apps/web/src/components/password-field.tsx` — estrutura da aplicação, não
pattern.

**Passo 4 — estado.** O medidor não declara `loading`/`error` próprios: ele é
uma projeção do valor digitado, e o dado vem da vitrine.

**Passo 5 — a story é o teste.** `PasswordStrength` ganha
`apps/storybook/src/stories/patterns/password-strength.stories.tsx` com os
estados nomeados e controles por `argTypes`; o JSDoc das props públicas
alimenta o autodocs. A lógica de `passwordRequirements` se afirma em
`password-requirements.test.ts` com `bun test` — sem DOM, sem story. Sem a
story do pattern, a extração não está entregue.

**O que a decisão evitou:**

| Decisão | Alternativa comum | Fonte |
| --- | --- | --- |
| Shell em `packages/patterns` | um medidor local em `features/auth`, copiado depois para a próxima feature | 006 |
| Feature fornece a lista de requisitos | shell recebendo a regra de senha por prop | 006 |
| Export público `@fifilo/patterns/password-strength` | import por caminho interno | 001 |
| Story junto da extração | pattern publicado sem teste de componente | 009 |
| Regra em `bun test`, interação na story | a mesma afirmação nas duas camadas | 008 |

---

## Antipadrões

| Antipadrão | Fonte |
| --- | --- |
| Componente neutro nascendo em `apps/web/src/features/<x>` | 006 |
| `apps/web/src/components` virando segunda biblioteca de UI | 006 |
| Cópia, alias ou wrapper que só renomeia componente do `@fifilo/ui` | 006 |
| Import por caminho interno de `packages/*` | 001 |
| Shell recebendo regra de domínio, rota, mutação ou permissão | 006 |
| Vitrine redesenhando moldura em vez de compor shell | 006 |
| Estado de superfície redeclarado na feature | 006 |
| Story reafirmando estado que `Patterns/StateSurface` já afirma | 006 |
| Primitivo ou pattern publicado sem story | 009 |
| Story ao lado do componente, fora de `apps/storybook/src/stories/<camada>` | 010 |
| `title:` carregando o grupo que o diretório já dá | 010 |
| Controle criado por troca de docgen em vez de `argTypes` | 011 |
| Mesmo comportamento afirmado em `.test.tsx` e em `play` | 008, 009 |
| Decidir a camada pela quantidade atual de consumidores | 006 |
| `-surface.tsx` cortado só para a story reaproveitar | 007 |
| Story montando o container em vez de `*FormFields` | 007 |
| `DialogPopup`/`DialogHeader`/`DialogFooter` remontados à mão numa feature | 006 |

---

## Passo 8 — Fechar

1. **Passe o bastão.** O componente escrito vai para `coss`; a story, para
   `storybook-story`; a página que o consome, para
   [`engineering-web`](../engineering-web/SKILL.md).
2. **Divergência transversal se rastreia, não se arrasta.** Legado que exige
   migração ampla vira entrega própria (Decisão 006, Decisão 016), sem inchar a
   entrega atual.
3. **Fronteira em disputa não é sua.** Se a dúvida é de contexto delimitado ou
   contrato compartilhado, vai para decisão registrada em `docs/decisions/`.

---

## Relacionados

- Decisão 006 — a fonte
- Decisão 007 — a forma da feature, e a dupla container + `*FormFields`
- Decisão 009 · 010 · 011 — a story como teste, o catálogo pelo diretório, controle por `argTypes`
- [`docs/engineering/component-ownership.md`](../../../docs/engineering/component-ownership.md) — a tabela de camadas
- [`docs/engineering/feature-delivery-flow.md`](../../../docs/engineering/feature-delivery-flow.md) § 5 e § 6 — a fatia Web e as stories
- [`engineering-web`](../engineering-web/SKILL.md) — a página que consome o shell
- [`engineering-refactor`](../engineering-refactor/SKILL.md) · [`engineering-review`](../engineering-review/SKILL.md)
- [Índice de decisões](../../../docs/decisions/README.md) — resolve número → arquivo → estado; decisão histórica não orienta código novo
