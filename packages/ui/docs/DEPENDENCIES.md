# UI Dependencies Policy

Este pacote concentra primitives compartilhadas e componentes copiados de Coss/Base UI.
As dependencias abaixo ficam pinadas para reduzir upgrades silenciosos que possam
quebrar o shell autenticado ou os fluxos de identidade e organização.

## Dependencias pinadas

- `@base-ui/react`
- `@fontsource-variable/inter`
- `class-variance-authority`
- `clsx`
- `geist`
- `lucide-react`
- `react`
- `react-day-picker`
- `tailwind-merge`

## Regra de manutenção

- Atualizar essas dependências somente em PR revisado;
- Validar autenticação, onboarding de organização e o shell quando houver bump;
- Registrar qualquer impacto visual ou de acessibilidade no review;
- Para o passo a passo de revisão e verificação, consulte [UPDATE_WORKFLOW.md](./UPDATE_WORKFLOW.md).

## Observação

Os manifests `package.json`, `apps/web/package.json` e `packages/ui/package.json`
também pinam as dependências de UI usadas pelo shell da aplicação.
