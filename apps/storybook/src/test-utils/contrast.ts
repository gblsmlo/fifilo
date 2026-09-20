/**
 * Icon contrast, which axe's `color-contrast` does not cover.
 *
 * The axe rule bails out early on an element with no real text child, and a
 * property's tone lives in an `<svg aria-hidden>`. A story that turns the rule
 * on to "prove the tone" proves nothing: swapping the tone for an illegible one
 * keeps everything green.
 *
 * The floor is 3:1, for a graphical object (WCAG 1.4.11), not the 4.5:1 of text.
 */
export const GRAPHIC_CONTRAST_FLOOR = 3

/**
 * Paints one pixel and reads the bytes. Reading `fillStyle` back does not work:
 * Chromium returns `oklch()` as it received it, instead of normalizing to
 * `#rrggbb`, and `oklch` is how this repository's theme tokens are written.
 *
 * The default canvas is sRGB, so the pixel read is already the conversion the
 * screen performs.
 */
function toRgb(color: string): [number, number, number] {
  const context = document.createElement('canvas').getContext('2d', {
    willReadFrequently: true,
  })
  if (!context) throw new Error('Canvas 2D unavailable: contrast cannot be measured.')

  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)

  const pixel = context.getImageData(0, 0, 1, 1).data

  if (pixel[3] === 0) throw new Error(`A transparent color has no contrast: ${color}`)

  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0]
}

function relativeLuminance(color: string): number {
  const [red, green, blue] = toRgb(color).map((channel) => {
    const ratio = channel / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * The effective background is that of the first ancestor that paints: a `plain`
 * surface is transparent and inherits the page background, and measuring
 * against `transparent` would give any number at all.
 */
export function effectiveBackgroundColor(element: Element): string {
  let current: Element | null = element

  while (current) {
    const background = getComputedStyle(current).backgroundColor
    if (background && background !== 'transparent' && !background.startsWith('rgba(0, 0, 0, 0)')) {
      return background
    }
    current = current.parentElement
  }

  return getComputedStyle(document.documentElement).backgroundColor
}

/**
 * Measures a property's icon against the background it actually paints over.
 * It returns what it measured so the story can also assert that the themes differ.
 */
export function measureIconContrast(root: ParentNode): {
  background: string
  color: string
  ratio: number
} {
  const icon = root.querySelector('svg')
  if (!icon) throw new Error('The story rendered no icon to measure.')

  const color = getComputedStyle(icon).color
  const background = effectiveBackgroundColor(icon)

  return { background, color, ratio: contrastRatio(color, background) }
}

/**
 * The color a token resolves to in the current theme. It serves to assert that
 * the icon uses the token, and not a palette literal that would stay the same in
 * both themes.
 */
export function computedTokenColor(token: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()

  return color
}
