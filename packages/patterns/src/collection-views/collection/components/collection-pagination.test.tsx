import { afterEach, describe, expect, test } from 'bun:test'

await import('../../../test/dom')

const { cleanup, fireEvent, render, screen } = await import('@testing-library/react')
const { CollectionPagination } = await import('./collection-pagination')

afterEach(cleanup)

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('CollectionPagination', () => {
  test('names the navigation with the collection vocabulary and shows page over count', () => {
    render(
      <CollectionPagination
        label='Paginação de contatos'
        onPageChange={() => undefined}
        page={2}
        pageCount={4}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Paginação de contatos' })).toBeTruthy()
    expect(screen.getByText('2 / 4')).toBeTruthy()
    expect(screen.queryByText(/ de /)).toBeNull()
  })

  test('summarizes the visible range when total and page size are known', () => {
    render(
      <CollectionPagination
        label='Paginação'
        onPageChange={() => undefined}
        page={3}
        pageCount={3}
        pageSize={25}
        total={57}
      />,
    )

    expect(screen.getByText('51–57 de 57')).toBeTruthy()
  })

  test('disables the leading controls on the first page and the trailing ones on the last', () => {
    const { rerender } = render(
      <CollectionPagination
        label='Paginação'
        onPageChange={() => undefined}
        page={1}
        pageCount={3}
      />,
    )

    expect(button('Primeira página').disabled).toBe(true)
    expect(button('Página anterior').disabled).toBe(true)
    expect(button('Próxima página').disabled).toBe(false)
    expect(button('Última página').disabled).toBe(false)

    rerender(
      <CollectionPagination
        label='Paginação'
        onPageChange={() => undefined}
        page={3}
        pageCount={3}
      />,
    )

    expect(button('Próxima página').disabled).toBe(true)
    expect(button('Última página').disabled).toBe(true)
    expect(button('Primeira página').disabled).toBe(false)
  })

  test('reports the target page, never a delta', () => {
    const pages: number[] = []
    render(
      <CollectionPagination
        label='Paginação'
        onPageChange={(page) => pages.push(page)}
        page={2}
        pageCount={5}
      />,
    )

    fireEvent.click(button('Primeira página'))
    fireEvent.click(button('Página anterior'))
    fireEvent.click(button('Próxima página'))
    fireEvent.click(button('Última página'))

    expect(pages).toEqual([1, 1, 3, 5])
  })

  test('clamps an out-of-range page into the count instead of rendering 0 / 0', () => {
    render(
      <CollectionPagination
        label='Paginação'
        onPageChange={() => undefined}
        page={9}
        pageCount={0}
      />,
    )

    expect(screen.getByText('1 / 1')).toBeTruthy()
    expect(button('Próxima página').disabled).toBe(true)
  })
})
