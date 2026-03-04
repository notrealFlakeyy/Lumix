'use client'

import * as React from 'react'

const COOKIE_NAME = 'lumix_tz'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+./?[\\\]^{|}-]/g, '\\\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function TimezoneSync() {
  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      if (getCookie(COOKIE_NAME) === tz) return
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(tz)}; Path=/; Max-Age=31536000; SameSite=Lax`
    } catch {
      // ignore
    }
  }, [])

  return null
}

