import { dbFail, fail, guard, isUuid, logActivity, ok, readJson, type RouteCtx } from './api'
import {
  ANNOUNCEMENT_PRIORITIES,
  AVAILABILITY,
  INVENTORY_CATEGORIES,
  LEDGER_TYPES,
  OPERATION_STATUSES,
  PRICE_CATEGORIES,
  RISK_LEVELS,
  ZONE_CATEGORIES,
  type Rank,
} from './constants'
import { db } from './db'
import type { Session } from './session'
import { parseFields, type FieldSpec } from './validate'

export type ResourceDef = {
  table: string
  label: string
  nameField: string
  order: { column: string; ascending: boolean }
  fields: Record<string, FieldSpec>
  stampCreate?: (s: Session) => Record<string, unknown>
  stampUpdate?: (s: Session) => Record<string, unknown>
  defaults?: (s: Session, data: Record<string, unknown>) => Record<string, unknown>
  minRankWrite?: Rank
  minRankDelete?: Rank
  allowUpdate?: boolean
}

export const resources = {
  zones: {
    table: 'br_zones',
    label: 'la zona',
    nameField: 'name',
    order: { column: 'created_at', ascending: false },
    fields: {
      name: { kind: 'text', required: true, max: 120 },
      category: { kind: 'enum', values: ZONE_CATEGORIES, required: true },
      postal: { kind: 'text', max: 20 },
      risk: { kind: 'enum', values: RISK_LEVELS },
      notes: { kind: 'text', max: 2000 },
      image_url: { kind: 'url' },
    },
    stampCreate: (s) => ({ created_by: s.ic }),
  },
  prices: {
    table: 'br_prices',
    label: 'el precio de',
    nameField: 'item_name',
    order: { column: 'item_name', ascending: true },
    fields: {
      item_name: { kind: 'text', required: true, max: 120 },
      category: { kind: 'enum', values: PRICE_CATEGORIES },
      buy_price: { kind: 'number', min: 0, max: 1e12, fallback: 0 },
      sell_price: { kind: 'number', min: 0, max: 1e12, fallback: 0 },
      internal_price: { kind: 'number', min: 0, max: 1e12, fallback: 0 },
      availability: { kind: 'enum', values: AVAILABILITY },
      notes: { kind: 'text', max: 1000 },
    },
    stampCreate: (s) => ({ updated_by: s.ic }),
    stampUpdate: (s) => ({ updated_by: s.ic, updated_at: new Date().toISOString() }),
  },
  inventory: {
    table: 'br_inventory',
    label: 'el ítem',
    nameField: 'item_name',
    order: { column: 'item_name', ascending: true },
    fields: {
      item_name: { kind: 'text', required: true, max: 120 },
      category: { kind: 'enum', values: INVENTORY_CATEGORIES },
      quantity: { kind: 'number', min: 0, max: 1e9, int: true, fallback: 0 },
      location: { kind: 'text', max: 120 },
      notes: { kind: 'text', max: 1000 },
    },
    stampCreate: (s) => ({ updated_by: s.ic }),
    stampUpdate: (s) => ({ updated_by: s.ic, updated_at: new Date().toISOString() }),
  },
  ledger: {
    table: 'br_ledger',
    label: 'el movimiento',
    nameField: 'label',
    order: { column: 'created_at', ascending: false },
    fields: {
      label: { kind: 'text', required: true, max: 160 },
      type: { kind: 'enum', values: LEDGER_TYPES, required: true },
      amount: { kind: 'number', required: true, min: 0.01, max: 1e12 },
      category: { kind: 'text', max: 60 },
      responsible: { kind: 'text', max: 80 },
      notes: { kind: 'text', max: 1000 },
    },
    defaults: (s, data) => (data.responsible ? {} : { responsible: s.ic }),
    allowUpdate: false,
    minRankDelete: 'Corona',
  },
  operations: {
    table: 'br_operations',
    label: 'la operación',
    nameField: 'name',
    order: { column: 'created_at', ascending: false },
    fields: {
      name: { kind: 'text', required: true, max: 140 },
      type: { kind: 'text', max: 60 },
      status: { kind: 'enum', values: OPERATION_STATUSES },
      team: { kind: 'list', maxItems: 30 },
      scheduled_time: { kind: 'text', max: 60 },
      amount: { kind: 'number', min: 0, max: 1e12, fallback: null },
      notes: { kind: 'text', max: 2000 },
    },
    stampCreate: (s) => ({ created_by: s.ic }),
  },
  announcements: {
    table: 'br_announcements',
    label: 'el comunicado',
    nameField: 'title',
    order: { column: 'created_at', ascending: false },
    fields: {
      title: { kind: 'text', required: true, max: 140 },
      body: { kind: 'text', required: true, max: 4000 },
      priority: { kind: 'enum', values: ANNOUNCEMENT_PRIORITIES },
    },
    stampCreate: (s) => ({ author_ic: s.ic }),
    minRankWrite: 'Alto Mando',
    minRankDelete: 'Alto Mando',
  },
} satisfies Record<string, ResourceDef>

export function collectionRoute(def: ResourceDef) {
  return {
    GET: async () => {
      const s = await guard()
      if (s instanceof Response) return s
      const { data, error } = await db()
        .from(def.table)
        .select('*')
        .order(def.order.column, { ascending: def.order.ascending })
        .limit(500)
      if (error) return dbFail(error)
      return ok(data)
    },
    POST: async (req: Request) => {
      const s = await guard(def.minRankWrite)
      if (s instanceof Response) return s
      const parsed = parseFields(await readJson(req), def.fields, false)
      if ('error' in parsed) return fail(parsed.error)
      const row = { ...parsed.data, ...def.defaults?.(s, parsed.data), ...def.stampCreate?.(s) }
      const { data, error } = await db().from(def.table).insert(row).select('*').single()
      if (error) return dbFail(error)
      await logActivity(s, `registró ${def.label}`, String(row[def.nameField] ?? ''))
      return ok(data, 201)
    },
  }
}

export function itemRoute(def: ResourceDef) {
  return {
    PATCH: async (req: Request, ctx: RouteCtx) => {
      if (def.allowUpdate === false) return fail('Este registro no se puede editar', 405)
      const s = await guard(def.minRankWrite)
      if (s instanceof Response) return s
      const { id } = await ctx.params
      if (!isUuid(id)) return fail('Identificador no válido')
      const parsed = parseFields(await readJson(req), def.fields, true)
      if ('error' in parsed) return fail(parsed.error)
      if (Object.keys(parsed.data).length === 0) return fail('No hay cambios que guardar')
      const row = { ...parsed.data, ...def.stampUpdate?.(s) }
      const { data, error } = await db().from(def.table).update(row).eq('id', id).select('*').maybeSingle()
      if (error) return dbFail(error)
      if (!data) return fail('Registro no encontrado', 404)
      await logActivity(s, `editó ${def.label}`, String(data[def.nameField] ?? ''))
      return ok(data)
    },
    DELETE: async (_req: Request, ctx: RouteCtx) => {
      const s = await guard(def.minRankDelete ?? def.minRankWrite)
      if (s instanceof Response) return s
      const { id } = await ctx.params
      if (!isUuid(id)) return fail('Identificador no válido')
      const { data, error } = await db().from(def.table).delete().eq('id', id).select(def.nameField).maybeSingle()
      if (error) return dbFail(error)
      if (!data) return fail('Registro no encontrado', 404)
      const name = (data as unknown as Record<string, unknown>)[def.nameField]
      await logActivity(s, `eliminó ${def.label}`, String(name ?? ''))
      return ok({ ok: true })
    },
  }
}
