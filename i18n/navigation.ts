import { createNavigation } from 'next-intl/navigation'

import { locales } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales: [...locales],
})

