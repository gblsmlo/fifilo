# Decision 031: Anthropic API and OpenRouter ship together as the two initial adapters

## Status

Active. Recorded on 2026-09-07 for the Fifilo product domain. Executed in
[Fase 07](../plans/fifilo/fase-07-fundacao-de-ia.md), by explicit product
direction rather than this starter's own default sequencing.

## Context

This starter's own default (Decision 016's decomposition gate, and the
pattern every other capability in this codebase follows) is: build for the
current, single consumer; a second implementation of anything earns its own
file only once a second real reason exists. Fase 07's own first draft named
Anthropic as the only adapter, deferring a second "until there is a reason."
The product direction for Fifilo names the reason for a second provider
explicitly and upfront, before either has a real caller: Anthropic API for
direct access to Claude-specific capability (prompt caching, extended
thinking, the newest model on the day it ships) without an aggregator's own
lag; OpenRouter for one key and one wire format across many providers'
models, covering cost comparison, fallback and model choice without
multiplying integration work per provider added later.

## Options considered

1. **Anthropic only, OpenRouter deferred until a concrete workspace need
   names it.** Matches this starter's own general bias against building for
   a hypothetical future - but the reason for OpenRouter here is not
   hypothetical, it is a stated product requirement independent of any
   specific Fase 08 feature.
2. **Both from the start, neither one "primary."** `packages/ai` ships
   `anthropic-backend.ts` and `openrouter-backend.ts` together, both passing
   `runBackendContract`, both configured through their own optional
   `packages/infra/env` variable. Which `AgentBackend` a given execution
   uses is configuration decided from Fase 08 onward (per workspace, or per
   task type) - this fase only guarantees both exist and are
   interchangeable behind the one port Decision 030 establishes.

## Decision

Adopt option 2. Neither adapter is deleted or deprioritized relative to the
other; `ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY` are each optional
individually in `packages/infra/env` (an environment can run with only one
configured), and `runBackendContract`'s live-call assertion skips per
adapter based on whether that adapter's own key is present, rather than
requiring both to validate the suite.

## Consequences

- `packages/ai/package.json` carries `@anthropic-ai/sdk` as its one
  provider-SDK dependency; OpenRouter needs none; its adapter is a plain
  `fetch` against `https://openrouter.ai/api/v1/chat/completions`; parsing
  its OpenAI-compatible SSE stream (`parseOpenRouterSseData`,
  `readSseData`, `ToolCallAccumulator`) is `openrouter-backend.ts`'s own
  pure, directly-tested logic.
- A workspace, or a future admin surface, choosing "cheapest available
  model" or "always Claude" is a configuration value naming a provider and
  a model string - Fase 08 onward's own concern, not something this fase's
  port needed to anticipate beyond existing.
- No live key ran against either adapter in the session that wrote this
  decision (see Fase 07's own session log) - `mapAnthropicEvent` and
  OpenRouter's SSE parsing are verified against synthetic, documented-shape
  data and a mocked transport respectively; a real smoke run against both
  providers is still owed once credentials exist.

## Revisit when

- A third provider earns an equally explicit, stated reason (Decision 030's
  own revisit trigger) - the port already makes that cheap.
- Either provider's pricing, capability or reliability changes enough that
  "neither is primary" stops being true for this product - that becomes a
  product decision about defaults, not an architecture one about the port.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 016: the decomposition gate this decision explicitly departs
  from, by stated product direction rather than by discovering a second
  real caller.
- Decision 030: the port both adapters implement.
