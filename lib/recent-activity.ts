export type RecentActivityRecord = {
  id: string
  courseId: string
  courseTitle?: string | null
  materialKey: string
  materialId?: string | null
  materialType: string
  materialTitle: string
  action: 'view' | 'download'
  url: string
  occurredAt: string
  source: 'local' | 'server'
}

const STORAGE_KEY = 'energylogic_recent_activity'
const MAX_ITEMS = 20

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

export const loadRecentActivity = (): RecentActivityRecord[] => {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentActivityRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => !!item && typeof item === 'object')
  } catch (error) {
    console.warn('Не удалось прочитать историю активности', error)
    return []
  }
}

const persistRecentActivity = (items: RecentActivityRecord[]) => {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.warn('Не удалось сохранить историю активности', error)
  }
}

export const appendRecentActivity = (record: Omit<RecentActivityRecord, 'id' | 'source'> & { source?: 'local' | 'server'; id?: string }) => {
  if (!isBrowser()) return

  const items = loadRecentActivity()
  const resolvedId = record.id ?? `${record.materialKey}-${record.action}-${Date.now()}`
  const entry: RecentActivityRecord = {
    ...record,
    id: resolvedId,
    source: record.source ?? 'local'
  }

  const deduped = [entry, ...items.filter((item) => item.materialKey !== record.materialKey || item.action !== record.action)]
  persistRecentActivity(deduped.slice(0, MAX_ITEMS))
}

export const mergeWithLocalActivity = (incoming: RecentActivityRecord[]): RecentActivityRecord[] => {
  const local = loadRecentActivity()
  const combined = [...incoming, ...local]

  const byKey = new Map<string, RecentActivityRecord>()

  combined
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .forEach((item) => {
      const key = `${item.materialKey}-${item.action}`
      if (!byKey.has(key)) {
        byKey.set(key, item)
      }
    })

  return Array.from(byKey.values()).slice(0, MAX_ITEMS)
}
