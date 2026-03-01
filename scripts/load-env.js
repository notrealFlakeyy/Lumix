/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

function parseEnvFile(contents) {
  const lines = contents.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (process.env[key] == null) {
      process.env[key] = value
    }
  }
}

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  try {
    const contents = fs.readFileSync(envPath, 'utf8')
    parseEnvFile(contents)
  } catch (err) {
    console.warn('Warning: failed to load .env.local for scripts:', err?.message ?? err)
  }
}

loadDotEnvLocal()

