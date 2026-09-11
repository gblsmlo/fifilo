import type { z } from 'zod'
import type { WorkspaceRole } from '../../access-control'
import { type DomainError, validationError } from '../../errors'
import type { EntityId } from '../../primitives'
import { type Result, err } from '../../result'

/**
 * The same context every HTTP route already carries (Fase 08 § "A regra
 * que sustenta a fase") - a tool call is a Core use case invoked with this,
 * never a raw database connection. `role` lets a tool decide for itself the
 * same way a route's own use case does (Decision 026); every tool this fase
 * ships is read-only, so today none of them actually reject `viewer`.
 */
export type ToolExecutionContext = {
  organizationId: string
  role: WorkspaceRole
  today: string
  userId: EntityId
}

export type AgentTool<Input, Output, Toolkit, Error = never> = {
  /** The use case this tool is - never a name with no corresponding one (Fase 08 § Ferramentas). */
  description: string
  execute: (
    input: Input,
    context: ToolExecutionContext,
    toolkit: Toolkit,
  ) => Promise<Result<Output, Error>>
  /** The use case's own Zod contract - one source, not two (Fase 08 § Ferramentas). */
  inputSchema: z.ZodType<Input>
  name: string
}

export type ToolInputInvalidError = DomainError<'validation', 'tool_input_invalid'>

/**
 * A tool call's arguments come from the model, not a typed caller - `run`
 * is where that boundary is validated (the same role an Elysia route's own
 * `body` schema plays elsewhere; there is no route here, so this function
 * *is* the boundary, not a second check behind one - Decision 002's
 * reasoning applied to the one boundary that actually exists for a tool
 * call).
 */
export type ErasedAgentTool<Toolkit> = {
  description: string
  inputSchema: z.ZodType<unknown>
  name: string
  run: (
    rawInput: unknown,
    context: ToolExecutionContext,
    toolkit: Toolkit,
  ) => Promise<Result<unknown, ToolInputInvalidError | unknown>>
}

export const eraseAgentTool = <Input, Output, Toolkit, Error>(
  tool: AgentTool<Input, Output, Toolkit, Error>,
): ErasedAgentTool<Toolkit> => ({
  description: tool.description,
  inputSchema: tool.inputSchema,
  name: tool.name,
  async run(rawInput, context, toolkit) {
    const parsed = tool.inputSchema.safeParse(rawInput)
    if (!parsed.success) {
      return err(validationError('tool_input_invalid', parsed.error.message))
    }
    return tool.execute(parsed.data, context, toolkit)
  },
})
