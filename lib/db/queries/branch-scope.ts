export function normalizeBranchScope(branchIds: readonly string[] | null | undefined) {
  const normalized = [...new Set((branchIds ?? []).filter(Boolean))]
  return normalized.length > 0 ? normalized : null
}

