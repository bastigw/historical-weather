// Exercises the IndexedDB cache with a real (in-memory) implementation, so the
// "one request per location, then offline" promise is actually tested.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { clear, set } from 'idb-keyval'
import { cacheKey, isStale } from '../src/lib/cache.js'
import { useArchive } from '../src/composables/useArchive.js'
import { archiveRange } from '../src/lib/openmeteo.js'

const fixture = JSON.parse(readFileSync('test/fixtures/trieste-20y.json', 'utf8'))
const TRIESTE = { latitude: 45.64953, longitude: 13.77678 }

function mockFetch(calls, { fail = false } = {}) {
  global.fetch = vi.fn(async (url) => {
    calls.push(String(url))
    if (fail) throw new TypeError('Failed to fetch')
    return { ok: true, json: async () => fixture }
  })
}

describe('cacheKey', () => {
  it('rounds to the reanalysis grid so nearby points share a cache entry', () => {
    const range = archiveRange()
    expect(cacheKey({ latitude: 45.649, longitude: 13.776 }, range)).toBe(
      cacheKey({ latitude: 45.652, longitude: 13.778 }, range),
    )
  })

  it('separates locations that are genuinely apart', () => {
    const range = archiveRange()
    expect(cacheKey({ latitude: 45.65, longitude: 13.78 }, range)).not.toBe(
      cacheKey({ latitude: 48.14, longitude: 11.58 }, range),
    )
  })
})

describe('isStale', () => {
  it('treats a missing entry as stale', () => {
    expect(isStale(null)).toBe(true)
  })

  it('keeps a recent entry and expires an old one', () => {
    expect(isStale({ fetchedAt: Date.now() })).toBe(false)
    expect(isStale({ fetchedAt: Date.now() - 40 * 86_400_000 })).toBe(true)
  })
})

describe('useArchive with a real store', () => {
  beforeEach(async () => {
    await clear()
    localStorage.clear()
  })

  it('fetches once, then serves the same location from the cache', async () => {
    const calls = []
    mockFetch(calls)

    const first = useArchive()
    await first.load(TRIESTE)
    expect(calls).toHaveLength(1)
    expect(first.data.value.dates.length).toBe(fixture.daily.time.length)
    expect(first.fromCache.value).toBe(false)

    // A fresh composable stands in for a later visit or a page reload.
    const second = useArchive()
    await second.load(TRIESTE)
    expect(calls).toHaveLength(1)
    expect(second.fromCache.value).toBe(true)
    expect(second.data.value.latitude).toBe(fixture.latitude)
  })

  it('falls back to the cached copy when the network is gone', async () => {
    const calls = []
    mockFetch(calls)
    await useArchive().load(TRIESTE)

    // Age the entry so the loader is obliged to try the network first.
    const key = cacheKey(TRIESTE, archiveRange())
    await set(key, { json: fixture, fetchedAt: Date.now() - 40 * 86_400_000 })

    mockFetch(calls, { fail: true })
    const offline = useArchive()
    await offline.load(TRIESTE)

    expect(offline.error.value).toBeNull()
    expect(offline.data.value).not.toBeNull()
    expect(offline.fromCache.value).toBe(true)
  })

  it('reports an error when there is neither network nor cache', async () => {
    const calls = []
    mockFetch(calls, { fail: true })

    const loader = useArchive()
    await loader.load({ latitude: 60.17, longitude: 24.94 })

    expect(loader.error.value).toBe('generic')
    expect(loader.data.value).toBeNull()
    expect(loader.loading.value).toBe(false)
  })
})
