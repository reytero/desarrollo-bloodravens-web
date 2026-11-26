import { dbFail, fail, ok, readJson } from '@/lib/br/api'
import { hashSecret } from '@/lib/br/crypto'
import { db } from '@/lib/br/db'
import { adminAlias } from '@/lib/br/session'
import { cleanText } from '@/lib/br/validate'

export async function POST(req: Request) {
  const body = await readJson(req)
  const alias = cleanText(body.alias, 40)
  const icName = cleanText(body.ic_name, 80)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!alias || !icName || !password) return fail('Completa alias, nombre IC y contraseña')
  if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(alias)) {
    return fail('El alias debe tener 3-40 caracteres (letras, números, punto, guion o guion bajo)')
  }
  if (password.length < 8 || password.length > 128) return fail('La contraseña debe tener entre 8 y 128 caracteres')
  if (alias.toLowerCase() === adminAlias().toLowerCase()) return fail('Ese alias no está disponible')

  const { data: existing, error: lookupError } = await db()
    .from('br_accounts')
    .select('id')
    .eq('alias_lower', alias.toLowerCase())
    .maybeSingle()
  if (lookupError) return dbFail(lookupError)
  if (existing) return fail('Ese alias no está disponible')

  const { error } = await db().from('br_accounts').insert({
    alias,
    alias_lower: alias.toLowerCase(),
    ic_name: icName,
    password_hash: hashSecret(password),
    rank: 'Recluta',
    status: 'pending',
  })
  if (error) {
    if (error.code === '23505') return fail('Ese alias no está disponible')
    return dbFail(error)
  }

  await db().from('br_activity').insert({ actor_alias: alias, actor_ic: icName, action: 'solicitó ingreso en la red' })
  return ok({ ok: true }, 201)
}
