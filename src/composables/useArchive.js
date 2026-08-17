import { ref, shallowRef } from 'vue'
import {
  archiveRange,
  fetchArchive,
  normalizeArchive,
  hasUsableData,
} from '../lib/openmeteo.js'
import { cacheKey, readArchive, writeArchive, isStale } from '../lib/cache.js'

/**
 * Loads the 20-year archive for a location, preferring the IndexedDB copy.
 *
 * Exactly one network request per location: everything the UI does afterwards
 * is computed locally from `data`.
 */
export function useArchive() {
  // shallowRef: the dataset holds typed arrays and a Map, which must not be
  // walked by Vue's deep reactivity.
  const data = shallowRef(null)
  const loading = ref(false)
  const error = ref(null)
  const fromCache = ref(false)

  let requestId = 0

  async function load(location) {
    const id = ++requestId
    loading.value = true
    error.value = null
    fromCache.value = false

    const range = archiveRange()
    const key = cacheKey(location, range)

    try {
      const cached = await readArchive(key)
      if (cached && !isStale(cached)) {
        if (id !== requestId) return
        data.value = normalizeArchive(cached.json)
        fromCache.value = true
        loading.value = false
        return
      }

      let json
      try {
        json = await fetchArchive({ ...location, ...range })
      } catch (networkError) {
        // Offline with a stale copy is far better than nothing.
        if (cached) {
          if (id !== requestId) return
          data.value = normalizeArchive(cached.json)
          fromCache.value = true
          loading.value = false
          return
        }
        throw networkError
      }

      if (id !== requestId) return

      const normalized = normalizeArchive(json)
      if (!hasUsableData(normalized)) {
        error.value = 'no-land'
        data.value = null
        return
      }

      data.value = normalized
      await writeArchive(key, json)
    } catch (caught) {
      if (id !== requestId) return
      console.error('Archive load failed', caught)
      error.value = 'generic'
      data.value = null
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  return { data, loading, error, fromCache, load }
}
