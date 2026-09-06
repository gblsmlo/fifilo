# Decision 027: Recharts is the chart library, chosen on four criteria

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 05](../plans/fifilo/fase-05-analytics-e-graficos.md).

## Context

Fase 05 needs a chart library for six projections rendered as neutral
compositions in `packages/patterns` (Decision 006). Fase 05 § Decisões a
registrar names the criterion ahead of the choice: React 19, composition by
component, usable accessibility, and an acceptable bundle size - and already
names Recharts as the expected outcome, with the trigger to revisit it.

## Options considered

1. **Recharts.** SVG-based, one React component per chart element
   (`<LineChart>`, `<Line>`, `<XAxis>`, `<Tooltip>`, ...), so a neutral
   wrapper composes exactly the elements a projection needs instead of
   configuring an opaque options object. `3.10.1` declares a React 19 peer
   range. SVG output means every data point is a real DOM node a browser's
   own accessibility tree and Storybook's `addon-a11y` can inspect - unlike a
   canvas-rendered chart, which is one opaque bitmap to assistive
   technology.
2. **visx.** Lower-level primitives (scales, shapes, no chart components) -
   more control, but every chart becomes bespoke composition work Fifilo
   does not need for six straightforward projections.
3. **A canvas-based library (e.g., a lightweight custom canvas renderer).**
   Better for tens of thousands of points, but a canvas has no DOM nodes for
   a screen reader or `axe` to find - Fase 05 § Web's accessible-table
   requirement becomes the only way to expose the data at all, and even the
   visual chart itself needs a hand-built `aria` description.

## Decision

Adopt Recharts.

Every chart still ships its own `sr-only` table (Fase 05 § Web) regardless of
library, because a sighted-only chart never satisfies "leitor de tela" on its
own - Recharts' SVG output only means the chart's own elements are also
inspectable, not that the table becomes optional.

Two neutral compositions cover the six projections because each pairs into
one shape: `TrendLineChart` (`packages/patterns/src/charts/trend-line-chart.tsx`)
is "a value per period, one or more series" and backs monthly cashflow and
balance evolution; `RankedBarChart`
(`packages/patterns/src/charts/ranked-bar-chart.tsx`) is "a value per label,
ranked" and backs spend by category and spend by account. Top expenses is a
row list, not a chart - a ranked table already is the accessible-first
presentation Fase 05 § Web asks a chart to fall back to, so building a third
chart type for it would be the pattern this starter's own scope rule warns
against: a composition invented for a hypothetical need rather than the
consumer in front of it.

## Consequences

- `packages/patterns/package.json` gains a plain `dependencies` entry for
  `recharts` (not a peer): the library is an implementation detail behind
  `TrendLineChart`/`RankedBarChart`'s own props, never a type a consumer
  imports directly.
- Color is never the only channel (Fase 05 § Web): `TrendLineChart` varies
  `strokeDasharray` per series alongside the `--chart-1`..`--chart-5` hues
  already themed in `apps/web/src/styles/global.css`; `RankedBarChart` prints
  each value on its own bar via `LabelList`.
- A story's `play` is the only place a chart's actual rendering is proven
  (Decision 009: jsdom does not measure layout) - `bun test` in
  `packages/patterns` covers only the pure color/dash-cycling helpers in
  `chart-colors.ts` and the accessible table's derivation, per the
  "component logic" row of `docs/engineering/test-plan.md`'s layer table.
- `isAnimationActive={false}` on every `Line`/`Bar`: a story's `play`
  function asserts against the rendered SVG immediately, and an animated
  entrance is motion Fifilo's financial dashboard does not need for its own
  sake.

## Revisit when

- A single chart needs to plot tens of thousands of points (Fase 05 §
  Decisões a registrar's own named trigger) - Recharts' SVG-per-point cost
  becomes real, and a canvas renderer trades the accessibility argument above
  for raw throughput.
- A projection needs a chart shape neither `TrendLineChart` nor
  `RankedBarChart` covers (a scatter, a stacked area) - a third composition
  joins them then, not before.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 006: component ownership - a neutral chart is `packages/patterns`,
  never `apps/web`.
- Decision 009: Storybook is a test layer - the `play` functions in
  `apps/storybook/src/stories/patterns/charts/*.stories.tsx` are these
  components' only rendering proof.
- Decision 028: what a chart receives is already a projected use-case result,
  never a query the component runs itself.
