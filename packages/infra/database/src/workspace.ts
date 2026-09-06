import { type SQL, sql } from 'drizzle-orm'

import type { WorkspaceTx } from './client'

/**
 * A Drizzle transaction (or db) handle with the full builder API available:
 * `tx.query.*`, `tx.select()`, `tx.insert()`, `tx.update()`, `tx.delete()` and
 * `tx.execute(sql)`. The workspace boundary delivers this to repositories so
 * the Drizzle builder is the default contract, not `execute(SQL)`.
 *
 * `execute(sql)` stays available for intentional raw SQL: RLS `set_config`,
 * CTEs, PostgreSQL functions and pointed escapes.
 */
export type WorkspaceExecutor = {
  execute(query: SQL): Promise<unknown>
}

export type Transactional<Tx> = {
  transaction<T>(operation: (tx: Tx) => Promise<T>): Promise<T>
}

type WorkspaceContextRow = {
  workspace_id: string | null
}

type ActorContextRow = {
  user_id: string | null
}

const readWorkspaceContext = async (tx: WorkspaceExecutor) => {
  const rows = (await tx.execute(
    sql`select nullif(current_setting('app.workspace_id', true), '') as workspace_id`,
  )) as WorkspaceContextRow[]

  return rows[0]?.workspace_id ?? null
}

export const applyWorkspaceContext = async <Tx extends WorkspaceExecutor>(
  tx: Tx,
  workspaceId: string,
): Promise<void> => {
  await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`)

  const currentWorkspaceId = await readWorkspaceContext(tx)
  if (currentWorkspaceId !== workspaceId) {
    throw new Error('Workspace database context was not applied')
  }
}

export const applyActorContext = async <Tx extends WorkspaceExecutor>(
  tx: Tx,
  userId: string,
): Promise<void> => {
  await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
  const rows = (await tx.execute(
    sql`select nullif(current_setting('app.user_id', true), '') as user_id`,
  )) as ActorContextRow[]
  if (rows[0]?.user_id !== userId) throw new Error('Actor database context was not applied')
}

/**
 * Runs `operation` inside a Drizzle transaction with the workspace RLS context
 * applied. The `tx` passed to `operation` is the full Drizzle transaction
 * (builder + execute), not a SQL-only executor.
 */
export const withWorkspaceTransactionOn = async <T, Tx>(
  database: Transactional<Tx>,
  workspaceId: string,
  operation: (tx: Tx) => Promise<T>,
): Promise<T> =>
  database.transaction(async (tx) => {
    await applyWorkspaceContext(tx as unknown as WorkspaceExecutor, workspaceId)
    return operation(tx)
  })

export const withActorWorkspaceTransactionOn = async <T, Tx>(
  database: Transactional<Tx>,
  workspaceId: string,
  userId: string,
  operation: (tx: Tx) => Promise<T>,
): Promise<T> =>
  database.transaction(async (tx) => {
    await applyWorkspaceContext(tx as unknown as WorkspaceExecutor, workspaceId)
    await applyActorContext(tx as unknown as WorkspaceExecutor, userId)
    return operation(tx)
  })

export const withWorkspaceTransaction = async <T>(
  workspaceId: string,
  operation: (tx: WorkspaceTx) => Promise<T>,
): Promise<T> => {
  const { db } = await import('./client')
  return withWorkspaceTransactionOn<T, WorkspaceTx>(db, workspaceId, operation)
}

export const withActorWorkspaceTransaction = async <T>(
  workspaceId: string,
  userId: string,
  operation: (tx: WorkspaceTx) => Promise<T>,
): Promise<T> => {
  const { db } = await import('./client')
  return withActorWorkspaceTransactionOn<T, WorkspaceTx>(db, workspaceId, userId, operation)
}
