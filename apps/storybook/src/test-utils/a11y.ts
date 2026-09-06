/**
 * Rules disabled in the catalog baseline. The list starts empty: a rule enters
 * here only with a measured violation count and an owner, and leaves when that
 * debt is paid. `a11y.test: 'todo'` in the preview reports without failing, so
 * a new story must not add violations even while the gate is not blocking.
 */
export const A11Y_BASELINE_RULES: Array<{ enabled: boolean; id: string }> = []
