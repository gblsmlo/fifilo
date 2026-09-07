import { type DomainError, notFoundError } from '../../errors'
import { type Result, err, ok } from '../../result'
import type { AiRunRepository } from '../ports'
import type { FinishAiRunInput } from '../run'

export type FinishRunCommand = FinishAiRunInput & {
  organizationId: string
}

export type FinishRunError = DomainError<'not_found', 'ai_run_not_found'>

export const finishRun = async (
  command: FinishRunCommand,
  repository: AiRunRepository,
): Promise<Result<true, FinishRunError>> => {
  const { organizationId, ...input } = command
  const found = await repository.finish(organizationId, input)

  if (!found) return err(notFoundError('ai_run_not_found', 'This AI run does not exist.'))
  return ok(true)
}
