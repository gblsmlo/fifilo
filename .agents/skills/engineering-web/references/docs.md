# Docs map

Leia `docs/00-architecture-map.md`, `docs/engineering/feature-delivery-flow.md`
§ 5 e `AGENTS.md` § apps/web antes de alterar limites entre routes, layouts,
feature pages, contratos Zod ou estado do client. A forma da feature é a
Decisão 007; resolva o número em `docs/decisions/README.md`.

## Code reference

Use `auth` como implementação de referência do flow:

- `apps/web/src/routes/(auth)/route.tsx` — grupo público e seu layout
- `apps/web/src/routes/(auth)/sign-up.tsx` — rota fina com search param
- `apps/web/src/routes/(authenticated)/route.tsx` — guarda de sessão
- `apps/web/src/features/auth/index.ts` — a API pública que as rotas importam
- `apps/web/src/features/auth/route-guard.ts` — `loadAuthenticatedRoute`
- `apps/web/src/features/auth/pages/sign-up-page.tsx` — a page
- `apps/web/src/features/auth/components/forms/sign-up-form.tsx` — container e `SignUpFormFields`
- `apps/web/src/features/auth/hooks/use-sign-up-form.ts` — dono de rede, navegação e toast
- `apps/web/src/features/auth/http/sign-up.ts` · `http/errors.ts` — adapter Eden puro
- `apps/web/src/features/auth/schemas/sign-up-form.ts` — camada de UX sobre o contrato
- `apps/web/src/features/auth/feedback.ts` — texto dos toasts
- `apps/web/src/features/auth/storybook/auth-story-fixtures.ts` — fixtures fora da árvore de produção
- `apps/web/src/features/users/current-user.ts` — leitura `200` por `api.me.get()`
- `apps/web/src/libs/api-client.ts` — `api`, `edenStatus`, `edenCreated`
- `apps/storybook/src/stories/features/auth/components/forms/sign-up-form.stories.tsx` — story do `*FormFields`
- `apps/storybook/src/stories/pages/register.stories.tsx` — story da página
