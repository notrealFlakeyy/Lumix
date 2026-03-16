import type { Membership } from '@/types/app'

export function getAccessibleBranchIds(membership: Pick<Membership, 'branchIds' | 'hasRestrictedBranchAccess'>) {
  return membership.hasRestrictedBranchAccess ? membership.branchIds : null
}

export function canAccessBranch(
  membership: Pick<Membership, 'branchIds' | 'hasRestrictedBranchAccess'>,
  branchId: string | null | undefined,
) {
  if (!membership.hasRestrictedBranchAccess) {
    return true
  }

  if (!branchId) {
    return false
  }

  return membership.branchIds.includes(branchId)
}

export function ensureBranchAccess(
  membership: Pick<Membership, 'branchIds' | 'hasRestrictedBranchAccess'>,
  branchId: string | null | undefined,
  entityLabel = 'record',
) {
  if (!canAccessBranch(membership, branchId)) {
    throw new Error(`You do not have access to the selected branch for this ${entityLabel}.`)
  }
}

