import type { Membership } from '@/types/app'

import { switchCompanyAction } from '@/lib/actions/switch-company'

export function CompanySwitcher({
  locale,
  memberships,
  currentCompanyId,
  redirectTo,
}: {
  locale: string
  memberships: Membership[]
  currentCompanyId: string
  redirectTo: string
}) {
  if (memberships.length <= 1) {
    return null
  }

  return (
    <form action={switchCompanyAction} className="flex items-center gap-2 rounded-full border border-border/30 bg-[rgb(var(--app-surface))] px-3 py-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <label htmlFor={`company-switcher-${redirectTo}`} className="sr-only">
        Active company
      </label>
      <select
        id={`company-switcher-${redirectTo}`}
        name="company_id"
        defaultValue={currentCompanyId}
        className="max-w-[13rem] truncate bg-transparent text-sm font-medium text-foreground outline-none"
      >
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.company_id}>
            {membership.company.name} ({membership.role})
          </option>
        ))}
      </select>
      <button type="submit" className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--app-accent))]">
        Switch
      </button>
    </form>
  )
}
