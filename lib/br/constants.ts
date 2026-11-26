export const RANKS = ['Recluta', 'Miembro', 'Sicario', 'Alto Mando', 'Corona'] as const
export type Rank = (typeof RANKS)[number]

export const MEMBER_STATUSES = ['Activo', 'Inactivo', 'Buscado'] as const
export const ACCOUNT_STATUSES = ['pending', 'approved', 'rejected'] as const

export const ZONE_CATEGORIES = [
  'Casa segura',
  'Punto de encuentro',
  'Alijo',
  'Zona caliente',
  'Territorio rival',
  'Punto de interés',
] as const
export const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO', 'CRÍTICO'] as const

export const PRICE_CATEGORIES = [
  'Armas',
  'Munición',
  'Drogas',
  'Vehículos',
  'Servicios',
  'Equipamiento',
  'General',
] as const
export const AVAILABILITY = ['Disponible', 'Escaso', 'Agotado', 'Bajo pedido'] as const

export const INVENTORY_CATEGORIES = [
  'Armas',
  'Munición',
  'Drogas',
  'Equipamiento',
  'Documentos',
  'Otros',
] as const

export const LEDGER_TYPES = ['Entrada', 'Salida'] as const

export const OPERATION_STATUSES = ['En preparación', 'Reconocimiento', 'En curso', 'Completada'] as const

export const ANNOUNCEMENT_PRIORITIES = ['ALTA', 'MEDIA', 'INFORMATIVA'] as const

export const DIPLOMACY_STATUSES = ['ALIADOS', 'NEUTRALES', 'ENEMIGOS'] as const

export const EVIDENCE_CATEGORIES = [
  'Operación',
  'Rivales',
  'Policía',
  'Territorio',
  'Contabilidad',
  'Otros',
] as const

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024
export const EVIDENCE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export const EVIDENCE_BUCKET = 'bloodravens-evidences'

export function rankLevel(rank: string): number {
  const i = RANKS.indexOf(rank as Rank)
  return i === -1 ? 0 : i
}

export function hasRank(rank: string, min: Rank): boolean {
  return rankLevel(rank) >= rankLevel(min)
}
