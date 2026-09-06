import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { Text, textVariants } = await import('./text')

afterEach(cleanup)

describe('textVariants', () => {
  test('uses predictable body text defaults', () => {
    const className = textVariants()

    expect(className).toContain('font-sans')
    expect(className).toContain('text-foreground')
    expect(className).toContain('text-base')
    expect(className).toContain('font-normal')
  })

  test.each([
    ['xs', 'text-xs'],
    ['base', 'text-base'],
    ['4xl', 'text-4xl'],
    ['9xl', 'text-9xl'],
  ] as const)('maps the Tailwind %s size', (size, expectedClass) => {
    expect(textVariants({ size })).toContain(expectedClass)
  })

  test('combines semantic typography variants', () => {
    const className = textVariants({
      align: 'center',
      family: 'heading',
      foreground: 'muted',
      leading: 'tight',
      size: '2xl',
      tracking: 'wide',
      truncate: true,
      weight: 'semibold',
    })

    expect(className).toContain('text-center')
    expect(className).toContain('font-heading')
    expect(className).toContain('text-muted-foreground')
    expect(className).toContain('leading-tight')
    expect(className).toContain('text-2xl')
    expect(className).toContain('tracking-wide')
    expect(className).toContain('truncate')
    expect(className).toContain('font-semibold')
  })
})

describe('Text', () => {
  test('renders a span by default', () => {
    render(<Text>Texto padrão</Text>)

    const text = screen.getByText('Texto padrão')

    expect(text.tagName).toBe('SPAN')
    expect(text.getAttribute('data-slot')).toBe('text')
  })

  test('renders polymorphically and preserves element props', () => {
    render(<Text id='text-heading' render={<h2>Título semântico</h2>} size='3xl' weight='bold' />)

    const heading = screen.getByRole('heading', { level: 2, name: 'Título semântico' })

    expect(heading.id).toBe('text-heading')
    expect(heading.className).toContain('text-3xl')
    expect(heading.className).toContain('font-bold')
  })

  test('lets className override a variant utility', () => {
    render(
      <Text className='text-lg' size='sm'>
        Tamanho sobrescrito
      </Text>,
    )

    const text = screen.getByText('Tamanho sobrescrito')

    expect(text.className).toContain('text-lg')
    expect(text.className).not.toContain('text-sm')
  })
})
