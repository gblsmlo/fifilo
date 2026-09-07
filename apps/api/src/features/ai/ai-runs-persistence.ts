import type { AiRunRepository, FinishAiRunInput, StartAiRunInput } from '@fifilo/core/ai'
import type { EntityId } from '@fifilo/core/primitives'
import { generateEntityId } from '@fifilo/core/primitives'
import { aiRuns } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq, sql } from 'drizzle-orm'

const start = async (input: StartAiRunInput): ReturnType<AiRunRepository['start']> =>
  withWorkspaceTransaction(input.organizationId, async (tx) => {
    const id = generateEntityId()
    const [row] = await tx
      .insert(aiRuns)
      .values({
        actorId: input.actorId,
        actorType: input.actorType,
        id,
        kind: input.kind,
        model: input.model,
        organizationId: input.organizationId,
        provider: input.provider,
        // A run's own terminal status is unknown until `finish` runs; a
        // dedicated 'running' value has no place in `AiRunStatus` (that
        // taxonomy is deliberately only terminal states, mirroring
        // `@fifilo/ai`'s `RunStatus`), so this row starts as 'failed' - the
        // safe assumption if the process crashes before ever calling
        // `finish` and nothing overwrites it.
        startedAt: new Date(),
        status: 'failed',
      })
      .returning({ id: aiRuns.id, startedAt: aiRuns.startedAt })

    if (!row) throw new Error('Failed to insert an AI run row.')
    return { id: row.id as EntityId, startedAt: row.startedAt }
  })

const finish = async (organizationId: string, input: FinishAiRunInput): Promise<boolean> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const updated = await tx
      .update(aiRuns)
      .set({
        costMinor: input.costMinor,
        currency: input.currency,
        error: input.error,
        finishedAt: sql`now()`,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        status: input.status,
      })
      .where(and(eq(aiRuns.organizationId, organizationId), eq(aiRuns.id, input.id)))
      .returning()

    return updated.length > 0
  })

export const createAiRunRepository = (): AiRunRepository => ({
  finish,
  start,
})
