import { dbFail, fail, guard, isUuid, logActivity, ok, type RouteCtx } from '@/lib/br/api'
import { EVIDENCE_BUCKET } from '@/lib/br/constants'
import { db } from '@/lib/br/db'

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const s = await guard()
  if (s instanceof Response) return s
  const { id } = await ctx.params
  if (!isUuid(id)) return fail('Identificador no válido')

  const { data: row, error } = await db()
    .from('br_evidences')
    .select('title, storage_path, author_alias')
    .eq('id', id)
    .maybeSingle()
  if (error) return dbFail(error)
  if (!row) return fail('Evidencia no encontrada', 404)
  if (s.rank !== 'Corona' && row.author_alias !== s.alias) return fail('Solo el autor o la Corona pueden borrarla', 403)

  await db().storage.from(EVIDENCE_BUCKET).remove([row.storage_path])
  const { error: deleteError } = await db().from('br_evidences').delete().eq('id', id)
  if (deleteError) return dbFail(deleteError)
  await logActivity(s, 'eliminó la evidencia', row.title)
  return ok({ ok: true })
}
