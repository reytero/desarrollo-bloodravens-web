import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function sessionSecret(): string {
  const explicit = process.env.SESSION_SECRET
  if (explicit && explicit.length >= 16) return explicit
  // Fallback derives a server-only secret so the app still works before SESSION_SECRET is configured.
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('SESSION_SECRET no configurado')
  return createHash('sha256').update(`bloodravens-session:${base}`).digest('hex')
}

export function hashSecret(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifySecret(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(plain, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function hmac(data: string): string {
  return createHmac('sha256', sessionSecret()).update(data).digest('base64url')
}

export function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${hmac(body)}`
}

export function verifyToken<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(hmac(body))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
