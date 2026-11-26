import { randomUUID } from 'node:crypto'
import { dbFail, fail, guard, logActivity, ok } from '@/lib/br/api'
import { EVIDENCE_BUCKET, EVIDENCE_CATEGORIES, EVIDENCE_MAX_BYTES, EVIDENCE_MIME } from '@/lib/br/constants'
import { db } from '@/lib/br/db'
import { cleanText } from '@/lib/br/validate'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function GET() {
  const s = await guard()
  if (s instanceof Response) return s
  const { data, error } = await db()
    .from('br_evidences')
    .select('id, title, category, storage_path, author_alias, author_ic, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return dbFail(error)
  if (!data.length) return ok([])

  const { data: signed } = await db()
    .storage.from(EVIDENCE_BUCKET)
    .createSignedUrls(
      data.map((row) => row.storage_path),
      60 * 60,
    )
  const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
  return ok(
    data.map((row) => ({
      ...row,
      url: urlByPath.get(row.storage_path) ?? null,
      canDelete: s.rank === 'Corona' || row.author_alias === s.alias,
    })),
  )
}

export async function POST(req: Request) {
  const s = await guard()
  if (s instanceof Response) return s

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail('Formulario no válido')
  }
  const file = form.get('file')
  const title = cleanText(form.get('title'), 140)
  const category = String(form.get('category') ?? 'Otros')

  if (!(file instanceof File)) return fail('Adjunta una imagen')
  if (!title) return fail('Añade un título a la evidencia')
  if (!EVIDENCE_CATEGORIES.includes(category as (typeof EVIDENCE_CATEGORIES)[number])) return fail('Categoría no válida')
  if (!EVIDENCE_MIME.includes(file.type as (typeof EVIDENCE_MIME)[number])) return fail('Formato no permitido (PNG, JPG, WEBP o GIF)')
  if (file.size > EVIDENCE_MAX_BYTES) return fail('La imagen supera los 5 MB')

  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${EXTENSIONS[file.type]}`
  const { error: uploadError } = await db()
    .storage.from(EVIDENCE_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (uploadError) return dbFail(uploadError)

  const { data, error } = await db()
    .from('br_evidences')
    .insert({ title, category, image_url: null, storage_path: path, author_alias: s.alias, author_ic: s.ic })
    .select('id')
    .single()
  if (error) {
    await db().storage.from(EVIDENCE_BUCKET).remove([path])
    return dbFail(error)
  }

  await logActivity(s, 'subió la evidencia', title)
  return ok(data, 201)
}
