/**
 * All statistics for a travel period.
 *
 * Pure functions over the normalized dataset produced by `openmeteo.js`.
 * Nothing here fetches, caches or renders — which is what makes it testable.
 *
 * A *period* is a calendar window, not a date range: `{ startMonth, startDay,
 * lengthDays }`. For each historic year the window is materialised into real
 * calendar dates, so leap days and windows that wrap across New Year fall out
 * of the date arithmetic instead of needing special cases.
 */

/** Thresholds that define the "days like this" counters. */
export const WET_DAY_MM = 1
export const FROST_C = 0
export const HOT_C = 30
export const OVERCAST_PCT = 80
export const SNOW_DAY_CM = 0.1

/** Metrics summarised across years, in display order. */
export const SUMMARY_METRICS = [
  'tmaxMean',
  'tminMean',
  'tmeanMean',
  'tmaxPeak',
  'tminLow',
  'precipTotal',
  'wetDays',
  'cloudMean',
  'sunshineMean',
  'sunshineTotal',
  'windMax',
  'frostDays',
  'hotDays',
  'snowDays',
  'overcastDays',
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isoFromParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day))
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`
}

/**
 * The actual calendar dates a window covers in a given year.
 *
 * Day overflow rolls into the next month or year automatically, so a window
 * starting 30 December simply continues into January.
 */
export function windowDatesForYear({ startMonth, startDay, lengthDays }, year) {
  const dates = []
  for (let offset = 0; offset < lengthDays; offset++) {
    dates.push(isoFromParts(year, startMonth, startDay + offset))
  }
  return dates
}

/** True when every day of the window exists in the dataset. */
function isFullyCovered(data, window, year) {
  return windowDatesForYear(window, year).every((date) => data.index.has(date))
}

/**
 * The most recent `count` years for which the whole window is covered.
 *
 * Returned oldest first. A window in March may therefore use a different set
 * of years than one in November — both get the freshest `count` years the data
 * can actually support, which matters more than using identical years.
 */
export function selectYears(data, window, count = 20) {
  const firstYear = Number(data.firstDate.slice(0, 4))
  const lastYear = Number(data.lastDate.slice(0, 4))
  const years = []
  for (let year = lastYear; year >= firstYear && years.length < count; year--) {
    if (isFullyCovered(data, window, year)) years.push(year)
  }
  return years.reverse()
}

/**
 * Statistics for one window in one year, or null if the window is not covered.
 *
 * Missing days are skipped rather than treated as zero; `coverage` reports how
 * much of the window actually had data.
 */
export function aggregateWindowForYear(data, window, year) {
  const dates = windowDatesForYear(window, year)
  const { columns } = data

  let n = 0
  let tmaxSum = 0
  let tminSum = 0
  let tmeanSum = 0
  let tmaxPeak = -Infinity
  let tminLow = Infinity
  let precipTotal = 0
  let cloudSum = 0
  let cloudDays = 0
  let sunshineTotal = 0
  let sunshineDays = 0
  let windMax = -Infinity
  let wetDays = 0
  let dryDays = 0
  let frostDays = 0
  let hotDays = 0
  let snowDays = 0
  let overcastDays = 0

  for (const date of dates) {
    const i = data.index.get(date)
    if (i === undefined) continue

    const tmax = columns.tmax[i]
    const tmin = columns.tmin[i]
    const tmean = columns.tmean[i]
    const precip = columns.precip[i]
    const cloud = columns.cloud[i]
    const sunshine = columns.sunshine[i]
    const wind = columns.wind[i]
    const snow = columns.snow[i]

    if (!Number.isNaN(tmax)) {
      n++
      tmaxSum += tmax
      if (tmax > tmaxPeak) tmaxPeak = tmax
      if (tmax >= HOT_C) hotDays++
    }
    if (!Number.isNaN(tmin)) {
      tminSum += tmin
      if (tmin < tminLow) tminLow = tmin
      if (tmin < FROST_C) frostDays++
    }
    if (!Number.isNaN(tmean)) tmeanSum += tmean
    if (!Number.isNaN(precip)) {
      precipTotal += precip
      if (precip >= WET_DAY_MM) wetDays++
      else dryDays++
    }
    if (!Number.isNaN(cloud)) {
      cloudSum += cloud
      cloudDays++
      if (cloud >= OVERCAST_PCT) overcastDays++
    }
    if (!Number.isNaN(sunshine)) {
      sunshineTotal += sunshine
      sunshineDays++
    }
    if (!Number.isNaN(wind) && wind > windMax) windMax = wind
    if (!Number.isNaN(snow) && snow >= SNOW_DAY_CM) snowDays++
  }

  if (n === 0) return null

  return {
    year,
    days: dates.length,
    coverage: n / dates.length,
    tmaxMean: tmaxSum / n,
    tminMean: tminSum / n,
    tmeanMean: tmeanSum / n,
    tmaxPeak,
    tminLow,
    precipTotal,
    precipMean: precipTotal / n,
    wetDays,
    dryDays,
    frostDays,
    hotDays,
    snowDays,
    overcastDays,
    cloudMean: cloudDays ? cloudSum / cloudDays : NaN,
    sunshineTotal,
    sunshineMean: sunshineDays ? sunshineTotal / sunshineDays : NaN,
    windMax: windMax === -Infinity ? NaN : windMax,
  }
}

/** Per-year statistics for every year in `years`, skipping uncovered ones. */
export function aggregateAllYears(data, window, years) {
  const result = []
  for (const year of years) {
    const stats = aggregateWindowForYear(data, window, year)
    if (stats) result.push(stats)
  }
  return result
}

/**
 * Linear-interpolated quantile, the same convention numpy uses by default.
 * `values` may be unsorted; it is not mutated.
 */
export function quantile(values, q) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return NaN
  if (sorted.length === 1) return sorted[0]
  const position = q * (sorted.length - 1)
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function describe(values) {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) {
    return { mean: NaN, median: NaN, p10: NaN, p25: NaN, p75: NaN, p90: NaN, min: NaN, max: NaN }
  }
  return {
    mean: finite.reduce((a, b) => a + b, 0) / finite.length,
    median: quantile(finite, 0.5),
    p10: quantile(finite, 0.1),
    p25: quantile(finite, 0.25),
    p75: quantile(finite, 0.75),
    p90: quantile(finite, 0.9),
    min: Math.min(...finite),
    max: Math.max(...finite),
  }
}

/** Collapses per-year statistics into mean/median/spread for each metric. */
export function aggregateAcrossYears(perYear, metrics = SUMMARY_METRICS) {
  const summary = { count: perYear.length, years: perYear.map((y) => y.year), metrics: {} }
  for (const metric of metrics) {
    summary.metrics[metric] = describe(perYear.map((y) => y[metric]))
  }
  return summary
}

/**
 * Least-squares trend of one metric over the years, expressed per decade.
 *
 * Twenty points is enough to see a direction, not enough to prove one — the UI
 * labels this as indicative.
 */
export function linearTrend(perYear, metric) {
  const points = perYear
    .map((y) => [y.year, y[metric]])
    .filter(([, value]) => Number.isFinite(value))
  if (points.length < 3) return null

  const n = points.length
  const meanX = points.reduce((a, [x]) => a + x, 0) / n
  const meanY = points.reduce((a, [, y]) => a + y, 0) / n

  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const [x, y] of points) {
    sxy += (x - meanX) * (y - meanY)
    sxx += (x - meanX) ** 2
    syy += (y - meanY) ** 2
  }
  if (sxx === 0) return null

  const slope = sxy / sxx
  return {
    slopePerYear: slope,
    slopePerDecade: slope * 10,
    intercept: meanY - slope * meanX,
    r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy),
    n,
    firstYear: points[0][0],
    lastYear: points[n - 1][0],
  }
}

/** The 366 `MM-DD` keys of a leap year, in calendar order. */
export function monthDayKeys() {
  const keys = []
  const cursor = new Date(Date.UTC(2020, 0, 1))
  while (cursor.getUTCFullYear() === 2020) {
    keys.push(`${pad2(cursor.getUTCMonth() + 1)}-${pad2(cursor.getUTCDate())}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return keys
}

/**
 * Day-of-year climatology: for every calendar day, the distribution of daily
 * highs and lows across all years, smoothed with a centred window so the curve
 * reads as a season rather than as noise. Smoothing wraps around New Year.
 *
 * Feeds both the year strip and the zoomed climatology chart.
 */
export function dayOfYearClimatology(data, { smoothDays = 7, years = null } = {}) {
  const keys = monthDayKeys()
  const position = new Map(keys.map((key, i) => [key, i]))
  const buckets = keys.map(() => [])

  const yearFilter = years ? new Set(years) : null
  for (let i = 0; i < data.dates.length; i++) {
    const date = data.dates[i]
    if (yearFilter && !yearFilter.has(Number(date.slice(0, 4)))) continue
    buckets[position.get(date.slice(5))].push(i)
  }

  const half = Math.floor(smoothDays / 2)
  const { columns } = data

  return keys.map((monthDay, p) => {
    const tmax = []
    const tmin = []
    const precip = []
    const cloud = []
    let wet = 0
    let precipDays = 0

    for (let offset = -half; offset <= half; offset++) {
      const bucket = buckets[(p + offset + keys.length) % keys.length]
      for (const i of bucket) {
        if (!Number.isNaN(columns.tmax[i])) tmax.push(columns.tmax[i])
        if (!Number.isNaN(columns.tmin[i])) tmin.push(columns.tmin[i])
        if (!Number.isNaN(columns.cloud[i])) cloud.push(columns.cloud[i])
        if (!Number.isNaN(columns.precip[i])) {
          precip.push(columns.precip[i])
          precipDays++
          if (columns.precip[i] >= WET_DAY_MM) wet++
        }
      }
    }

    const mean = (values) =>
      values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN

    return {
      monthDay,
      month: Number(monthDay.slice(0, 2)),
      day: Number(monthDay.slice(3)),
      index: p,
      samples: tmax.length,
      tmax: {
        mean: mean(tmax),
        median: quantile(tmax, 0.5),
        p10: quantile(tmax, 0.1),
        p25: quantile(tmax, 0.25),
        p75: quantile(tmax, 0.75),
        p90: quantile(tmax, 0.9),
      },
      tmin: {
        mean: mean(tmin),
        median: quantile(tmin, 0.5),
        p10: quantile(tmin, 0.1),
        p25: quantile(tmin, 0.25),
        p75: quantile(tmin, 0.75),
        p90: quantile(tmin, 0.9),
      },
      precipMean: mean(precip),
      cloudMean: mean(cloud),
      wetProbability: precipDays ? wet / precipDays : NaN,
    }
  })
}

const CONDITIONS = {
  wet: (c, i) => (Number.isNaN(c.precip[i]) ? null : c.precip[i] >= WET_DAY_MM),
  frost: (c, i) => (Number.isNaN(c.tmin[i]) ? null : c.tmin[i] < FROST_C),
  hot: (c, i) => (Number.isNaN(c.tmax[i]) ? null : c.tmax[i] >= HOT_C),
  overcast: (c, i) => (Number.isNaN(c.cloud[i]) ? null : c.cloud[i] >= OVERCAST_PCT),
  snow: (c, i) => (Number.isNaN(c.snow[i]) ? null : c.snow[i] >= SNOW_DAY_CM),
}

/**
 * How likely each condition is during the window.
 *
 * `perDay` is the chance that an arbitrary day of the trip is like this;
 * `atLeastOne` is the share of years where it happened at least once — the
 * more useful number when packing a rain jacket.
 */
export function probabilities(data, window, years) {
  const result = {}

  for (const [name, test] of Object.entries(CONDITIONS)) {
    let matchingDays = 0
    let observedDays = 0
    let yearsWithAny = 0
    let yearsObserved = 0

    for (const year of years) {
      let any = false
      let observedInYear = 0
      for (const date of windowDatesForYear(window, year)) {
        const i = data.index.get(date)
        if (i === undefined) continue
        const hit = test(data.columns, i)
        if (hit === null) continue
        observedDays++
        observedInYear++
        if (hit) {
          matchingDays++
          any = true
        }
      }
      if (observedInYear > 0) {
        yearsObserved++
        if (any) yearsWithAny++
      }
    }

    result[name] = {
      perDay: observedDays ? matchingDays / observedDays : NaN,
      atLeastOne: yearsObserved ? yearsWithAny / yearsObserved : NaN,
      matchingDays,
      observedDays,
    }
  }

  return result
}
