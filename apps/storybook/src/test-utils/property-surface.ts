import { expect } from 'storybook/test'

/**
 * A property surface has two treatments: `badge`, filled, and `plain`, without
 * fill. In jsdom that was only verifiable through the class string, which
 * passes even when the utility does not resolve. Here the evidence is the
 * computed background color.
 */
const NO_FILL = 'rgba(0, 0, 0, 0)'

function surface(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')

  if (!found) {
    throw new Error('The story rendered no [data-slot="property-surface"].')
  }

  return found
}

export async function expectBadgeSurface(canvasElement: HTMLElement): Promise<void> {
  await expect(getComputedStyle(surface(canvasElement)).backgroundColor).not.toBe(NO_FILL)
}

export async function expectPlainSurface(canvasElement: HTMLElement): Promise<void> {
  await expect(getComputedStyle(surface(canvasElement)).backgroundColor).toBe(NO_FILL)
}

/**
 * The hover fill in `plain` is the `badge` pill, drawn by `::before` so it takes
 * no space. Without measuring the inset, it goes back to being born from the
 * box — and then it pushes the value out and is measured against a parent it
 * sizes itself.
 */
export async function expectBadgeFill(canvasElement: HTMLElement): Promise<void> {
  const element = surface(canvasElement)
  const box = getComputedStyle(element)
  const fill = getComputedStyle(element, '::before')

  await expect(box.padding).toBe('0px')
  await expect(box.margin).toBe('0px')
  await expect(fill.position).toBe('absolute')
  await expect(fill.left).toBe('-9px')
  await expect(fill.right).toBe('-9px')
  await expect(fill.top).toBe('-2px')
  await expect(fill.bottom).toBe('-2px')
}

export async function expectAbsenceTone(canvasElement: HTMLElement): Promise<void> {
  await expect(getComputedStyle(surface(canvasElement)).color).not.toBe(
    getComputedStyle(canvasElement).color,
  )
}

export async function expectAvatarEdge(canvasElement: HTMLElement, edge: number): Promise<void> {
  const avatar = canvasElement.querySelector<HTMLElement>('[data-slot="avatar"]')

  if (!avatar) {
    throw new Error('The story rendered no [data-slot="avatar"].')
  }

  const measured = avatar.getBoundingClientRect()

  await expect(measured.width).toBe(edge)
  await expect(measured.height).toBe(edge)
}
