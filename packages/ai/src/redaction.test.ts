import { describe, expect, test } from 'bun:test'

import { redactPersonalData } from './redaction'

describe('redactPersonalData', () => {
  test('replaces a known name, an email and a CPF-shaped document - none reach the output verbatim', () => {
    const input = {
      messages: [
        {
          content:
            'O titular é Ana Souza, e-mail ana.souza@example.com, CPF 123.456.789-09. Analise os gastos.',
          role: 'user' as const,
        },
      ],
    }

    const { entries, input: redacted } = redactPersonalData(input, ['Ana Souza'])

    const content = redacted.messages[0]?.content ?? ''
    expect(content).not.toContain('Ana Souza')
    expect(content).not.toContain('ana.souza@example.com')
    expect(content).not.toContain('123.456.789-09')
    expect(entries.map((entry) => entry.value)).toEqual([
      'Ana Souza',
      'ana.souza@example.com',
      '123.456.789-09',
    ])
  })

  test('the same value maps to the same reference everywhere it appears', () => {
    const input = {
      messages: [
        { content: 'Ana Souza pediu um relatório.', role: 'user' as const },
        { content: 'Ana Souza tem três contas.', role: 'user' as const },
      ],
      systemPrompt: 'O usuário se chama Ana Souza.',
    }

    const { entries, input: redacted } = redactPersonalData(input, ['Ana Souza'])

    expect(entries).toHaveLength(1)
    const [reference] = entries.map((entry) => entry.reference)
    expect(redacted.messages[0]?.content).toContain(reference)
    expect(redacted.messages[1]?.content).toContain(reference)
    expect(redacted.systemPrompt).toContain(reference)
  })

  test('a known value never mentioned in the text adds no entry', () => {
    const input = { messages: [{ content: 'Sem nada sensível aqui.', role: 'user' as const }] }

    const { entries } = redactPersonalData(input, ['Alguém Que Não Aparece'])

    expect(entries).toHaveLength(0)
  })

  test('leaves ordinary financial text untouched', () => {
    const input = {
      messages: [{ content: 'Gasto de R$ 300,00 em Mercado.', role: 'user' as const }],
    }

    const { entries, input: redacted } = redactPersonalData(input)

    expect(entries).toHaveLength(0)
    expect(redacted.messages[0]?.content).toBe('Gasto de R$ 300,00 em Mercado.')
  })

  test('redacts a CNPJ-shaped document even with no known-value match', () => {
    const input = {
      messages: [
        { content: 'Fornecedor CNPJ 12.345.678/0001-95 pago hoje.', role: 'user' as const },
      ],
    }

    const { input: redacted } = redactPersonalData(input)

    expect(redacted.messages[0]?.content).not.toContain('12.345.678/0001-95')
  })
})
