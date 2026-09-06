/**
 * The row-level-security recipe every tenant-owned table repeats (Decision
 * 020), as the exact statements a migration appends after its `create table`.
 * Drizzle Kit has no builder for `force row level security`, so this stays
 * hand-written SQL rather than a schema-level helper Drizzle would generate.
 *
 * `current_setting(..., true)` returns `NULL` instead of raising when no
 * workspace transaction set it, so a query outside `withWorkspaceTransaction`
 * sees zero rows instead of raising or leaking every tenant's. `nullif` keeps
 * an empty string from matching by accident. `force` is what subjects the
 * table owner — the role this application connects as — to its own policy;
 * without it every statement below still runs, the migration still looks
 * complete, and nothing is protected. `tableName` is always this package's own
 * literal, never external input (Decision 004's closed-list exception for a
 * dynamic identifier).
 */
export const tenantWorkspacePolicyDdl = (tableName: string): readonly string[] => {
  const condition = `organization_id = nullif(current_setting('app.workspace_id', true), '')`

  return [
    `alter table "${tableName}" enable row level security`,
    `alter table "${tableName}" force row level security`,
    `create policy "${tableName}_workspace" on "${tableName}" using (${condition}) with check (${condition})`,
  ]
}
