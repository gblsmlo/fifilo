import { type DomainError, forbiddenError } from './errors'
import { type Result, err, ok } from './result'

/**
 * The server-resolved role for the acting session (Fase 04 § Modelagem):
 * never sent by the client as evidence (Decision 002), always read from
 * `members.role` the same way `ActorContext.role` already is.
 */
export type WorkspaceRole = 'admin' | 'member' | 'owner' | 'viewer'

export type AccessControlError = DomainError<'forbidden', 'insufficient_role'>

const workspaceRoles: readonly WorkspaceRole[] = ['admin', 'member', 'owner', 'viewer']

/**
 * `members.role` is an untyped `text` column (Better Auth's own schema); a
 * value this table has never held is a data problem, not a reason to trust
 * it as a privileged role. Fails closed to `viewer` - the one role every
 * write already rejects - rather than assume it means "at least member."
 */
export const toWorkspaceRole = (role: string): WorkspaceRole =>
  (workspaceRoles as readonly string[]).includes(role) ? (role as WorkspaceRole) : 'viewer'

/**
 * `viewer` is the one role every financial write use case rejects (Fase 04 §
 * Modelagem's matrix: every resource but viewer keeps read/write). The check
 * lives here, once, so a use case calls it instead of repeating the
 * comparison - a hard-to-audit place for a security rule to drift.
 */
export const requireFinancialWriteAccess = (
  role: WorkspaceRole,
): Result<true, AccessControlError> =>
  role === 'viewer'
    ? err(forbiddenError('insufficient_role', 'A read-only member cannot make this change.'))
    : ok(true)

const isOwnerOrAdmin = (role: WorkspaceRole): boolean => role === 'owner' || role === 'admin'

/**
 * Workspace settings are the first resource where member and admin diverge
 * (Decision 026's own revisit trigger): `currency`, `timezone` and
 * `monthStartDay` change every projection and every new entry's civil date
 * for the whole workspace, so only `owner` and `admin` may change them - a
 * `member` keeps read/write on every financial resource but not on the
 * settings that define how they are all interpreted.
 */
export const requireSettingsWriteAccess = (
  role: WorkspaceRole,
): Result<true, AccessControlError> =>
  isOwnerOrAdmin(role)
    ? ok(true)
    : err(
        forbiddenError(
          'insufficient_role',
          'Only an owner or admin can change workspace settings.',
        ),
      )

/**
 * A full-workspace export is the single read that reaches the most rows at
 * once (Fase 06 § Riscos); `security.md`'s access matrix caps it at owner and
 * admin the same way it caps workspace settings, so this shares the same
 * owner-or-admin predicate under its own message rather than repeating the
 * comparison.
 */
export const requireExportAccess = (role: WorkspaceRole): Result<true, AccessControlError> =>
  isOwnerOrAdmin(role)
    ? ok(true)
    : err(forbiddenError('insufficient_role', 'Only an owner or admin can export workspace data.'))

/**
 * The AI budget is workspace-wide spend configuration (Fase 07 §
 * Guardrails #3) - the same owner-or-admin predicate as workspace settings
 * and export, under its own message.
 */
export const requireAiBudgetWriteAccess = (
  role: WorkspaceRole,
): Result<true, AccessControlError> =>
  isOwnerOrAdmin(role)
    ? ok(true)
    : err(forbiddenError('insufficient_role', 'Only an owner or admin can set the AI budget.'))

/**
 * Toggling the workspace kill switch turns AI off for everyone in it (Fase
 * 07 § Guardrails #4) - owner-or-admin, matching every other workspace-wide
 * configuration change this codebase gates the same way.
 */
export const requireAiKillSwitchAccess = (role: WorkspaceRole): Result<true, AccessControlError> =>
  isOwnerOrAdmin(role)
    ? ok(true)
    : err(
        forbiddenError(
          'insufficient_role',
          'Only an owner or admin can change the AI kill switch.',
        ),
      )
