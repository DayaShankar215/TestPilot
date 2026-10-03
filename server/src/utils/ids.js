import crypto from 'node:crypto'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Human-readable sequential reference such as `TC-1042`. */
export function nextRef(prefix, existingRefs) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  for (const ref of existingRefs) {
    const match = String(ref ?? '').match(pattern)
    if (!match) continue
    max = Math.max(max, Number.parseInt(match[1], 10))
  }
  return `${prefix}-${max + 1}`
}

/** Opaque, URL-safe session token. Only a hash of it is stored server-side. */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function shortCode(length = 12) {
  const bytes = crypto.randomBytes(length)
  let output = ''
  for (const byte of bytes) output += ALPHABET[byte % ALPHABET.length]
  return output
}

export function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function hostOf(value) {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}