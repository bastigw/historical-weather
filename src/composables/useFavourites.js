import { ref, watch } from 'vue'

const STORAGE_KEY = 'hw:favourites'
const MAX_FAVOURITES = 12

/** Only the fields we actually need, so stored entries stay small and stable. */
function slim(location) {
  return {
    id: location.id,
    name: location.name,
    country: location.country,
    country_code: location.country_code,
    admin1: location.admin1,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
  }
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const favourites = ref(load())
watch(
  favourites,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true },
)

const sameLocation = (a, b) =>
  a.id === b.id ||
  (Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01)

export function useFavourites() {
  function isFavourite(location) {
    return !!location && favourites.value.some((f) => sameLocation(f, location))
  }

  /** Most recently used first, so the list doubles as a recents list. */
  function remember(location) {
    const entry = slim(location)
    favourites.value = [entry, ...favourites.value.filter((f) => !sameLocation(f, entry))].slice(
      0,
      MAX_FAVOURITES,
    )
  }

  function forget(location) {
    favourites.value = favourites.value.filter((f) => !sameLocation(f, location))
  }

  function toggle(location) {
    if (isFavourite(location)) forget(location)
    else remember(location)
  }

  return { favourites, isFavourite, remember, forget, toggle }
}
