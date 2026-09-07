import type { AgentInput } from './backend'

export type RedactionEntry = {
  reference: string
  value: string
}

export type RedactionResult = {
  entries: RedactionEntry[]
  input: AgentInput
}

// CPF- and CNPJ-shaped numbers, with or without punctuation - a fail-safe
// net, not a validator; a false positive costs an opaque reference, a false
// negative costs a document number reaching the provider.
const DOCUMENT_PATTERN =
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const EMAIL_PATTERN = /[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g

/**
 * Everything level 3 or 4 that would otherwise reach a provider as plain
 * text (Fase 07 § Guardrails #2). `knownValues` is the caller's own set of
 * names and identifiers already loaded for this run (an account holder's
 * name, an organization member's name) - the values a regex alone could
 * never recognize as personal. Email and document-shaped numbers are
 * redacted regardless, as the regex-only safety net.
 *
 * The same value always maps to the same `[ref:N]` within one call, so the
 * server can resolve a reference back to its real value once the response
 * returns - the resolution never happens where the provider could see it.
 */
export const redactPersonalData = (
  input: AgentInput,
  knownValues: readonly string[] = [],
): RedactionResult => {
  const entries: RedactionEntry[] = []

  const referenceFor = (value: string): string => {
    const existing = entries.find((entry) => entry.value === value)
    if (existing) return existing.reference
    const reference = `[ref:${entries.length + 1}]`
    entries.push({ reference, value })
    return reference
  }

  const redactText = (text: string): string => {
    let result = text
    for (const value of knownValues) {
      if (!value || !result.includes(value)) continue
      result = result.split(value).join(referenceFor(value))
    }
    result = result.replaceAll(EMAIL_PATTERN, (match) => referenceFor(match))
    result = result.replaceAll(DOCUMENT_PATTERN, (match) => referenceFor(match))
    return result
  }

  return {
    entries,
    input: {
      ...input,
      messages: input.messages.map((message) => ({
        ...message,
        content: redactText(message.content),
      })),
      systemPrompt: input.systemPrompt ? redactText(input.systemPrompt) : input.systemPrompt,
    },
  }
}
