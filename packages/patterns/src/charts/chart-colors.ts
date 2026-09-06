/**
 * The five-hue chart palette already themed for light and dark in
 * `apps/web/src/styles/global.css`'s `--chart-1`..`--chart-5` (Tailwind's own
 * `@theme inline` maps them to `--color-chart-*`, unused until this package
 * needed them) - never a color a chart component invents on its own.
 */
const PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const

export const chartColorAt = (index: number): string => PALETTE[index % PALETTE.length] as string

/**
 * A second channel besides hue (Fase 05 § Web: "cor nunca é o único canal")
 * for a line series - solid, dashed, dotted, then repeating combinations, so
 * two series stay distinguishable in grayscale or to color-blind vision.
 */
const DASH_PATTERNS = ['0', '8 4', '2 3', '8 4 2 3'] as const

export const dashPatternAt = (index: number): string =>
  DASH_PATTERNS[index % DASH_PATTERNS.length] as string
