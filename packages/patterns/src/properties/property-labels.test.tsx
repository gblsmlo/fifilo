import { afterEach, describe, expect, test } from 'bun:test'

await import('../test/dom')

const { cleanup, render, screen } = await import('@testing-library/react')
const { StatusProperty } = await import('./status/status-property')
const { PriorityProperty } = await import('./priority/priority-property')

afterEach(cleanup)

/**
 * The label language is a contract, not a preset detail: the catalog was born
 * mirroring an English tracker and showed "In Progress" in the middle of a
 * Portuguese screen. The vocabulary below is the same one `apps/web`
 * already used in its filters — translating with other words would create two
 * names for the same state.
 */
const STATUS = [
  ['backlog', 'Planejada'],
  ['blocked', 'Bloqueada'],
  ['canceled', 'Cancelada'],
  ['done', 'Concluída'],
  ['inProgress', 'Em andamento'],
  ['review', 'Em revisão'],
  ['todo', 'Pendente'],
] as const

const PRIORITY = [
  ['high', 'Alta'],
  ['low', 'Baixa'],
  ['medium', 'Média'],
  ['no_priority', 'Sem prioridade'],
  ['urgent', 'Urgente'],
] as const

describe('catalog label language', () => {
  test.each(STATUS)('status %s exibe "%s"', (value, label) => {
    render(<StatusProperty readOnly value={value} />)

    expect(screen.getByText(label)).toBeTruthy()
  })

  test.each(PRIORITY)('prioridade %s exibe "%s"', (value, label) => {
    render(<PriorityProperty readOnly value={value} />)

    expect(screen.getByText(label)).toBeTruthy()
  })
})
