import { describe, expect, test } from 'bun:test'

import { runBackendContract } from './contract'
import { createStubBackend } from './stub-backend'

runBackendContract('stub', () => createStubBackend(), { model: 'stub-model' })

describe('createStubBackend', () => {
  test('yields the default text-then-completed sequence', async () => {
    const backend = createStubBackend()
    const collected = []

    for await (const message of backend.run(
      { messages: [{ content: 'hi', role: 'user' }] },
      { model: 'stub-model', organizationId: 'org_a' },
    )) {
      collected.push(message)
    }

    expect(collected).toEqual([
      { kind: 'text', text: 'stub response' },
      { kind: 'status', status: 'completed' },
    ])
  })

  test('yields whatever fixed sequence the caller configures', async () => {
    const backend = createStubBackend({
      messages: [
        { kind: 'tool-use', id: 't1', input: { q: 'saldo' }, name: 'lookup_balance' },
        { kind: 'tool-result', output: { balanceMinor: 10_000 }, toolUseId: 't1' },
        { kind: 'text', text: 'Seu saldo é R$ 100,00.' },
        { kind: 'status', status: 'completed' },
      ],
    })
    const collected = []

    for await (const message of backend.run(
      { messages: [{ content: 'qual meu saldo?', role: 'user' }] },
      { model: 'stub-model', organizationId: 'org_a' },
    )) {
      collected.push(message)
    }

    expect(collected).toHaveLength(4)
    expect(collected[2]).toEqual({ kind: 'text', text: 'Seu saldo é R$ 100,00.' })
  })
})
