import { normalizeArchive, toISODate } from '../../src/lib/openmeteo.js'

/** Every date from `startISO` to `endISO` inclusive. */
export function dateRange(startISO, endISO) {
  const dates = []
  const cursor = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  while (cursor <= end) {
    dates.push(toISODate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

const DEFAULTS = {
  tmax: 15,
  tmin: 5,
  tmean: 10,
  precip: 0,
  rain: 0,
  snow: 0,
  precipHours: 0,
  cloud: 50,
  sunshineHours: 5,
  wind: 10,
  weatherCode: 0,
}

/**
 * Builds a normalized dataset for tests.
 *
 * `overrides` maps an ISO date to partial day values; `base` is a function
 * receiving (isoDate, index) for values that vary systematically. Values are
 * fed through the real `normalizeArchive`, so unit conversion and null
 * handling are exercised too. Pass `null` for a value to simulate a data gap.
 */
export function makeData(startISO, endISO, { base = () => ({}), overrides = {} } = {}) {
  const dates = dateRange(startISO, endISO)
  const daily = {
    time: dates,
    temperature_2m_max: [],
    temperature_2m_min: [],
    temperature_2m_mean: [],
    precipitation_sum: [],
    rain_sum: [],
    snowfall_sum: [],
    precipitation_hours: [],
    cloud_cover_mean: [],
    sunshine_duration: [],
    wind_speed_10m_max: [],
    weather_code: [],
  }

  dates.forEach((date, i) => {
    const day = { ...DEFAULTS, ...base(date, i), ...(overrides[date] ?? {}) }
    daily.temperature_2m_max.push(day.tmax)
    daily.temperature_2m_min.push(day.tmin)
    daily.temperature_2m_mean.push(day.tmean)
    daily.precipitation_sum.push(day.precip)
    daily.rain_sum.push(day.rain)
    daily.snowfall_sum.push(day.snow)
    daily.precipitation_hours.push(day.precipHours)
    daily.cloud_cover_mean.push(day.cloud)
    // The API reports sunshine in seconds.
    daily.sunshine_duration.push(day.sunshineHours === null ? null : day.sunshineHours * 3600)
    daily.wind_speed_10m_max.push(day.wind)
    daily.weather_code.push(day.weatherCode)
  })

  return normalizeArchive({
    latitude: 45.65,
    longitude: 13.78,
    elevation: 2,
    timezone: 'Europe/Rome',
    daily,
  })
}
