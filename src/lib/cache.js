/**
 * Persistent cache for archive responses.
 *
 * One location costs a single ~500 KB request covering 20 years; keeping it in
 * IndexedDB means every later period selection is instant and works offline.
 * The key deliberately ignores the exact end date so the app does not re-download
 * half a megabyte every day just to gain one more day of history.
 */
import { get, set, del, keys } from 'idb-keyval'

const PREFIX = 'archive:'
const MAX_ENTRIES = 12
const MAX_AGE_DAYS = 30

/** Coordinates are rounded to the reanalysis grid, so nearby points share data. */
export function cacheKey({ latitude, longitude }, { startDate }) {
  return `${PREFIX}${latitude.toFixed(2)},${longitude.toFixed(2)}:${startDate}`
}

function ageInDays(entry) {
  return (Date.now() - entry.fetchedAt) / 86_400_000
}

export function isStale(entry) {
  return !entry || ageInDays(entry) > MAX_AGE_DAYS
}

export async function readArchive(key) {
  try {
    return (await get(key)) ?? null
  } catch {
    // Private browsing or a blocked storage quota: degrade to network-only.
    return null
  }
}

export async function writeArchive(key, json) {
  try {
    await set(key, { json, fetchedAt: Date.now() })
    await prune()
  } catch {
    // Caching is an optimisation; failing to cache must never break a lookup.
  }
}

/** Drops the oldest entries once the cache grows past `MAX_ENTRIES`. */
async function prune() {
  const all = (await keys()).filter((k) => typeof k === 'string' && k.startsWith(PREFIX))
  if (all.length <= MAX_ENTRIES) return
  const entries = await Promise.all(
    all.map(async (k) => ({ key: k, fetchedAt: (await get(k))?.fetchedAt ?? 0 })),
  )
  entries.sort((a, b) => a.fetchedAt - b.fetchedAt)
  for (const entry of entries.slice(0, entries.length - MAX_ENTRIES)) {
    await del(entry.key)
  }
}

export async function cachedKeys() {
  return (await keys()).filter((k) => typeof k === 'string' && k.startsWith(PREFIX))
}
