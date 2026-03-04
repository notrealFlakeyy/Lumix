const USERNAME_EMAIL_DOMAIN = 'users.lumix.local'

export function toUsernameEmail(usernameOrEmail: string) {
  const raw = usernameOrEmail.trim()
  if (raw.includes('@')) return raw
  const username = normalizeUsername(raw)
  return `${username}@${USERNAME_EMAIL_DOMAIN}`
}

export function normalizeUsername(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '.')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')

  const clipped = base.slice(0, 32)
  return clipped.length >= 3 ? clipped : `user.${Math.floor(1000 + Math.random() * 9000)}`
}

export function generateUsername(fullNameOrHint: string) {
  const hint = fullNameOrHint.trim()
  const tokens = hint.split(/\s+/).filter(Boolean)
  const base =
    tokens.length >= 2 ? `${tokens[0]}.${tokens[tokens.length - 1]}` : tokens.length === 1 ? tokens[0] : 'user'
  const normalized = normalizeUsername(base)
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${normalized}.${suffix}`
}

