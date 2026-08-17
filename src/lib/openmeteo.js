/**
 * Open-Meteo API access.
 *
 * Data comes from the ECMWF Copernicus ERA5 / ERA5-Land reanalysis, served by
 * Open-Meteo. No API key is required and the endpoints send
 * `access-control-allow-origin: *`, so the browser talks to them directly.
 *
 * Everything in this module is pure except `fetchArchive` / `searchLocations`.
 */

export const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/** How many historic years a period is averaged over. */
export const HISTORY_YEARS = 20

/**
 * The reanalysis trails real time by about 5 days. Ask for one day less than
 * that so we never request a range the API cannot fill yet.
 */
export const DATA_LAG_DAYS = 6

/** Daily variables we request. Order matters only for readability. */
export const DAILY_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'precipitation_sum',
  'rain_sum',
  'snowfall_sum',
  'precipitation_hours',
  'cloud_cover_mean',
  'sunshine_duration',
  'wind_speed_10m_max',
  'weather_code',
]

/** Maps API variable names onto the short column names used everywhere else. */
const COLUMNS = {
  temperature_2m_max: 'tmax',
  temperature_2m_min: 'tmin',
  temperature_2m_mean: 'tmean',
  precipitation_sum: 'precip',
  rain_sum: 'rain',
  snowfall_sum: 'snow',
  precipitation_hours: 'precipHours',
  cloud_cover_mean: 'cloud',
  sunshine_duration: 'sunshine',
  wind_speed_10m_max: 'wind',
  weather_code: 'weatherCode',
}

/** Formats a Date as `YYYY-MM-DD` using its UTC fields. */
export function toISODate(date) {
  const y = String(date.getUTCFullYear()).padStart(4, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Builds a UTC Date from calendar parts, rolling over out-of-range days. */
export function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day))
}

/**
 * The date range to download for a location.
 *
 * Ends at the last day the reanalysis can be expected to cover, and starts on
 * 1 January of the year `HISTORY_YEARS` before that. This always contains at
 * least `HISTORY_YEARS` complete years for any calendar window, including ones
 * that wrap across New Year.
 */
export function archiveRange(now = new Date(), years = HISTORY_YEARS) {
  const end = new Date(now.getTime())
  end.setUTCDate(end.getUTCDate() - DATA_LAG_DAYS)
  const start = utcDate(end.getUTCFullYear() - years, 1, 1)
  return { startDate: toISODate(start), endDate: toISODate(end) }
}

export function buildArchiveUrl({ latitude, longitude, startDate, endDate }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: DAILY_VARIABLES.join(','),
    timezone: 'auto',
    // Prefer a land grid cell so coastal towns are not averaged with the sea.
    cell_selection: 'land',
  })
  return `${ARCHIVE_URL}?${params}`
}

export function buildGeocodingUrl({ name, language = 'en', count = 8 }) {
  const params = new URLSearchParams({
    name,
    count: String(count),
    language,
    format: 'json',
  })
  return `${GEOCODING_URL}?${params}`
}

/**
 * Turns an archive response into typed-array columns plus a date index.
 *
 * Nulls become NaN so downstream maths can skip them with a single check.
 * Sunshine duration is converted from seconds to hours here, so no other
 * module has to know about the API's unit.
 */
export function normalizeArchive(json) {
  const daily = json?.daily
  if (!daily || !Array.isArray(daily.time)) {
    throw new Error('Malformed archive response: missing daily.time')
  }

  const dates = daily.time
  const index = new Map()
  for (let i = 0; i < dates.length; i++) index.set(dates[i], i)

  const columns = {}
  for (const [apiName, column] of Object.entries(COLUMNS)) {
    const source = daily[apiName]
    const values = new Float32Array(dates.length)
    for (let i = 0; i < dates.length; i++) {
      const raw = source ? source[i] : null
      values[i] = raw === null || raw === undefined ? NaN : raw
    }
    columns[column] = values
  }

  // Seconds -> hours, once, at the boundary.
  for (let i = 0; i < columns.sunshine.length; i++) {
    columns.sunshine[i] = columns.sunshine[i] / 3600
  }

  return {
    latitude: json.latitude,
    longitude: json.longitude,
    elevation: json.elevation,
    timezone: json.timezone,
    dates,
    index,
    columns,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  }
}

/**
 * True when the location has real land data. Ocean grid points come back as a
 * full series of nulls, which is worth catching before showing empty charts.
 */
export function hasUsableData(data) {
  const t = data.columns.tmax
  let seen = 0
  for (let i = 0; i < t.length; i++) {
    if (!Number.isNaN(t[i]) && ++seen > 30) return true
  }
  return false
}

export async function fetchArchive({ latitude, longitude, startDate, endDate }, { signal } = {}) {
  const url = buildArchiveUrl({ latitude, longitude, startDate, endDate })
  const response = await fetch(url, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.reason || `Archive request failed (${response.status})`)
  }
  return response.json()
}

export async function searchLocations({ name, language, count }, { signal } = {}) {
  const response = await fetch(buildGeocodingUrl({ name, language, count }), { signal })
  if (!response.ok) throw new Error(`Location search failed (${response.status})`)
  const json = await response.json()
  return json.results ?? []
}
