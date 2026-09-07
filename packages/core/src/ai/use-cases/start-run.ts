import type { EntityId } from '../../primitives'
import type { AiRunRepository } from '../ports'
import type { StartAiRunInput } from '../run'

export const startRun = async (
  input: StartAiRunInput,
  repository: AiRunRepository,
): Promise<{ id: EntityId; startedAt: Date }> => repository.start(input)
