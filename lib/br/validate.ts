export type FieldSpec =
  | { kind: 'text'; max?: number; required?: boolean }
  | { kind: 'enum'; values: readonly string[]; required?: boolean }
  | { kind: 'number'; min?: number; max?: number; int?: boolean; required?: boolean; fallback?: number | null }
  | { kind: 'list'; maxItems?: number }
  | { kind: 'url' }

export type ParseResult = { data: Record<string, unknown> } | { error: string }

export function cleanText(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, max)
}

export function parseFields(
  body: Record<string, unknown>,
  spec: Record<string, FieldSpec>,
  partial: boolean,
): ParseResult {
  const data: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(spec)) {
    const present = key in body
    if (partial && !present) continue
    const raw = body[key]

    switch (field.kind) {
      case 'text': {
        const value = cleanText(raw, field.max ?? 500)
        if (field.required && !value) return { error: `El campo "${key}" es obligatorio` }
        data[key] = value
        break
      }
      case 'enum': {
        if (raw === undefined || raw === null || raw === '') {
          if (field.required) return { error: `El campo "${key}" es obligatorio` }
          if (!partial) continue
          return { error: `Valor no válido para "${key}"` }
        }
        if (!field.values.includes(String(raw))) return { error: `Valor no válido para "${key}"` }
        data[key] = String(raw)
        break
      }
      case 'number': {
        if (raw === undefined || raw === null || raw === '') {
          if (field.required) return { error: `El campo "${key}" es obligatorio` }
          if (field.fallback !== undefined) data[key] = field.fallback
          continue
        }
        const num = Number(raw)
        if (!Number.isFinite(num)) return { error: `"${key}" debe ser un número` }
        if (field.int && !Number.isInteger(num)) return { error: `"${key}" debe ser un número entero` }
        if (field.min !== undefined && num < field.min) return { error: `"${key}" es demasiado bajo` }
        if (field.max !== undefined && num > field.max) return { error: `"${key}" es demasiado alto` }
        data[key] = num
        break
      }
      case 'list': {
        const arr = Array.isArray(raw) ? raw : []
        data[key] = arr
          .map((item) => cleanText(item, 80))
          .filter((item): item is string => Boolean(item))
          .slice(0, field.maxItems ?? 20)
        break
      }
      case 'url': {
        const value = cleanText(raw, 1000)
        if (value && !/^https?:\/\//i.test(value)) return { error: 'La URL de imagen debe empezar por http(s)://' }
        data[key] = value
        break
      }
    }
  }
  return { data }
}
