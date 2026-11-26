import { dbFail, fail, ok, readJson } from '@/lib/br/api'
import { safeEqual, verifySecret } from '@/lib/br/crypto'
import { db } from '@/lib/br/db'
import { adminAlias, adminPassword, startSession } from '@/lib/br/session'
import { cleanText } from '@/lib/br/validate'

const attempts = new Map<string, { count: number; until: number }>()
const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 8

function throttleKey(req: Request, alias: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  return `${ip}:${alias}`
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const alias = cleanText(body.alias, 40)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!alias || !password) return fail('Introduce alias y contraseña')

  const key = throttleKey(req, alias.toLowerCase())
  const entry = attempts.get(key)
  if (entry && entry.until > Date.now() && entry.count >= MAX_ATTEMPTS) {
    return fail('Demasiados intentos. Espera unos minutos.', 429)
  }
  const registerFailure = () => {
    const current = attempts.get(key)
    const fresh = !current || current.until < Date.now()
    attempts.set(key, { count: fresh ? 1 : current.count + 1, until: fresh ? Date.now() + WINDOW_MS : current.until })
    return fail('Alias o contraseña incorrectos', 401)
  }

  if (alias.toLowerCase() === adminAlias().toLowerCase()) {
    if (!safeEqual(password, adminPassword())) return registerFailure()
    attempts.delete(key)
    await startSession('root')
    await db().from('br_activity').insert({ actor_alias: adminAlias(), actor_ic: 'La Corona', action: 'inició sesión' })
    return ok({ ok: true })
  }

  const { data: account, error } = await db()
    .from('br_accounts')
    .select('id, alias, ic_name, password_hash, status')
    .eq('alias_lower', alias.toLowerCase())
    .maybeSingle()
  if (error) return dbFail(error)
  if (!account || !verifySecret(password, account.password_hash)) return registerFailure()

  attempts.delete(key)
  if (account.status === 'pending') {
    return fail('Tu solicitud de ingreso sigue pendiente. La Corona aún no la ha revisado.', 403)
  }
  if (account.status === 'rejected') {
    return fail('Tu solicitud de ingreso fue rechazada por la Corona.', 403)
  }

  await db().from('br_accounts').update({ last_access: new Date().toISOString() }).eq('id', account.id)
  await startSession(account.id)
  await db().from('br_activity').insert({ actor_alias: account.alias, actor_ic: account.ic_name, action: 'inició sesión' })
  return ok({ ok: true })
}
