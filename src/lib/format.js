/** Locale-aware value formatting. Units are metric throughout. */

const intlLocale = (locale) => (locale === 'de' ? 'de-DE' : 'en-GB')

function number(value, locale, digits = 1) {
  if (!Number.isFinite(value)) return '–'
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export const formatNumber = number

export function formatTemperature(value, locale, digits = 1) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value, locale, digits)} °C`
}

export function formatMillimetres(value, locale, digits = 0) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value, locale, digits)} mm`
}

export function formatPercent(value, locale, digits = 0) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value * 100, locale, digits)} %`
}

export function formatPercentValue(value, locale, digits = 0) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value, locale, digits)} %`
}

export function formatHours(value, locale, digits = 1) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value, locale, digits)} h`
}

export function formatSpeed(value, locale, digits = 0) {
  if (!Number.isFinite(value)) return '–'
  return `${number(value, locale, digits)} km/h`
}

export function formatDays(value, locale, digits = 1) {
  return number(value, locale, digits)
}

/** A leap-year reference date, so 29 February can be formatted like any other. */
function referenceDate(month, day) {
  return new Date(Date.UTC(2020, month - 1, day))
}

export function formatMonthDay(month, day, locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(referenceDate(month, day))
}

export function formatMonthShort(month, locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    timeZone: 'UTC',
  }).format(referenceDate(month, 1))
}

/**
 * "22 – 28 Nov" for a window, or a single date when it is one day long.
 * The end date is derived by walking the leap-year calendar, so windows that
 * wrap past 31 December read correctly.
 */
export function formatWindow({ startMonth, startDay, lengthDays }, locale) {
  const start = referenceDate(startMonth, startDay)
  if (lengthDays === 1) {
    return formatMonthDay(startMonth, startDay, locale)
  }
  const end = new Date(start.getTime())
  end.setUTCDate(end.getUTCDate() + lengthDays - 1)
  const startText = formatMonthDay(startMonth, startDay, locale)
  const endText = formatMonthDay(end.getUTCMonth() + 1, end.getUTCDate(), locale)
  return `${startText} – ${endText}`
}

/** Rounds coordinates for display without pretending to more precision. */
export function formatCoordinate(value, locale) {
  return number(value, locale, 2)
}

export function locationLabel(location) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(', ')
}

export function locationShortLabel(location) {
  return [location.name, location.country_code].filter(Boolean).join(', ')
}
