import { type DomainError, notFoundError } from '../../errors'
import { type Result, err } from '../../result'
import { type AssistantToolkit, findAssistantTool } from '../tools'
import type { ToolExecutionContext, ToolInputInvalidError } from '../tools/types'

export type RunToolCommand = {
  name: string
  rawInput: unknown
}

export type RunToolError =
  | DomainError<'not_found', 'tool_not_found'>
  | ToolInputInvalidError
  | unknown

export const runTool = async (
  command: RunToolCommand,
  context: ToolExecutionContext,
  toolkit: AssistantToolkit,
): Promise<Result<unknown, RunToolError>> => {
  const tool = findAssistantTool(command.name)
  if (!tool) {
    return err(notFoundError('tool_not_found', `No tool named "${command.name}".`))
  }

  return tool.run(command.rawInput, context, toolkit)
}
