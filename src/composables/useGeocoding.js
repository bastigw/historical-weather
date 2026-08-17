import { ref } from 'vue'
import { searchLocations } from '../lib/openmeteo.js'

const DEBOUNCE_MS = 250
const MIN_QUERY = 2

/** Debounced, abortable location search against the Open-Meteo geocoder. */
export function useGeocoding(locale) {
  const results = ref([])
  const searching = ref(false)
  const error = ref(null)

  let timer = null
  let controller = null

  function cancel() {
    clearTimeout(timer)
    controller?.abort()
    controller = null
    searching.value = false
  }

  function search(query) {
    clearTimeout(timer)
    controller?.abort()

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY) {
      results.value = []
      searching.value = false
      error.value = null
      return
    }

    searching.value = true
    error.value = null
    timer = setTimeout(async () => {
      controller = new AbortController()
      try {
        results.value = await searchLocations(
          { name: trimmed, language: locale.value },
          { signal: controller.signal },
        )
      } catch (caught) {
        if (caught.name === 'AbortError') return
        error.value = 'search'
        results.value = []
      } finally {
        searching.value = false
      }
    }, DEBOUNCE_MS)
  }

  return { results, searching, error, search, cancel }
}
