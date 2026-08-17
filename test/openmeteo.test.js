// @vitest-environment node
// Reads a fixture from disk, so it needs real Node module URLs rather than jsdom's.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  toISODate,
  archiveRange,
  buildArchiveUrl,
  buildGeocodingUrl,
  normalizeArchive,
  hasUsableData,
  DAILY_VARIABLES,
} from '../src/lib/openmeteo.js'
import {
  selectYears,
  aggregateAllYears,
  aggregateAcrossYears,
  probabilities,
  dayOfYearClimatology,
} from '../src/lib/aggregate.js'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/trieste-20y.json', import.meta.url), 'utf8'),
)

describe('toISODate', () => {
  it('formats a UTC date', () => {
    expect(toISODate(new Date('2026-08-16T22:30:00Z'))).toBe('2026-08-16')
  })
})

describe('archiveRange', () => {
  it('ends six days back and starts twenty years before that', () => {
    const range = archiveRange(new Date('2026-08-16T00:00:00Z'))
    expect(range.endDate).toBe('2026-08-10')
    expect(range.startDate).toBe('2006-01-01')
  })

  it('handles an end date that falls back into the previous year', () => {
    const range = archiveRange(new Date('2026-01-03T00:00:00Z'))
    expect(range.endDate).toBe('2025-12-28')
    expect(range.startDate).toBe('2005-01-01')
  })
})

describe('url building', () => {
  it('requests every daily variable in local time from a land cell', () => {
    const url = buildArchiveUrl({
      latitude: 45.65,
      longitude: 13.78,
      startDate: '2006-01-01',
      endDate: '2026-08-10',
    })
    expect(url).toContain('archive-api.open-meteo.com')
    expect(url).toContain('timezone=auto')
    expect(url).toContain('cell_selection=land')
    for (const variable of DAILY_VARIABLES) expect(decodeURIComponent(url)).toContain(variable)
  })

  it('passes the interface language to the geocoder', () => {
    expect(buildGeocodingUrl({ name: 'Triest', language: 'de' })).toContain('language=de')
  })
})

describe('normalizeArchive', () => {
  const data = normalizeArchive(fixture)

  it('indexes every day of the range', () => {
    expect(data.dates).toHaveLength(fixture.daily.time.length)
    expect(data.index.get('2023-11-22')).toBe(data.dates.indexOf('2023-11-22'))
    expect(data.firstDate).toBe('2006-01-01')
  })

  it('converts sunshine duration from seconds to hours', () => {
    const i = data.index.get('2023-11-22')
    expect(data.columns.sunshine[i]).toBeCloseTo(fixture.daily.sunshine_duration[i] / 3600, 3)
    expect(data.columns.sunshine[i]).toBeLessThan(24)
  })

  it('turns nulls into NaN', () => {
    const gappy = normalizeArchive({
      daily: {
        time: ['2020-01-01', '2020-01-02'],
        temperature_2m_max: [5, null],
        temperature_2m_min: [1, null],
      },
    })
    expect(gappy.columns.tmax[0]).toBe(5)
    expect(Number.isNaN(gappy.columns.tmax[1])).toBe(true)
    // A variable absent from the response is all-NaN rather than undefined.
    expect(Number.isNaN(gappy.columns.cloud[0])).toBe(true)
  })

  it('rejects a malformed response', () => {
    expect(() => normalizeArchive({})).toThrow(/daily.time/)
  })
})

describe('hasUsableData', () => {
  it('accepts a real land location', () => {
    expect(hasUsableData(normalizeArchive(fixture))).toBe(true)
  })

  it('rejects an all-null series such as an open-sea grid point', () => {
    const empty = normalizeArchive({
      daily: {
        time: Array.from({ length: 100 }, (_, i) => `2020-01-${String((i % 28) + 1).padStart(2, '0')}`),
        temperature_2m_max: Array(100).fill(null),
      },
    })
    expect(hasUsableData(empty)).toBe(false)
  })
})

describe('real data end to end (Trieste, 22-28 November)', () => {
  const data = normalizeArchive(fixture)
  const window = { startMonth: 11, startDay: 22, lengthDays: 7 }
  const years = selectYears(data, window, 20)
  const perYear = aggregateAllYears(data, window, years)
  const summary = aggregateAcrossYears(perYear)

  it('uses the twenty most recent complete years', () => {
    expect(years).toHaveLength(20)
    expect(years[0]).toBe(2006)
    expect(years.at(-1)).toBe(2025)
  })

  it('produces plausible late-autumn Adriatic values', () => {
    expect(summary.metrics.tmaxMean.mean).toBeGreaterThan(6)
    expect(summary.metrics.tmaxMean.mean).toBeLessThan(16)
    expect(summary.metrics.tminMean.mean).toBeLessThan(summary.metrics.tmaxMean.mean)
    expect(summary.metrics.wetDays.mean).toBeGreaterThan(0)
    expect(summary.metrics.wetDays.mean).toBeLessThan(7)
    expect(summary.metrics.cloudMean.mean).toBeGreaterThan(20)
    expect(summary.metrics.cloudMean.mean).toBeLessThan(100)
  })

  it('spreads the years apart', () => {
    expect(summary.metrics.tmaxMean.p90).toBeGreaterThan(summary.metrics.tmaxMean.p10)
  })

  it('gives sensible probabilities', () => {
    const p = probabilities(data, window, years)
    expect(p.wet.perDay).toBeGreaterThan(0)
    expect(p.wet.perDay).toBeLessThan(1)
    expect(p.wet.atLeastOne).toBeGreaterThanOrEqual(p.wet.perDay)
    expect(p.hot.perDay).toBe(0)
  })

  it('has a warmer July than January in the climatology', () => {
    const climatology = dayOfYearClimatology(data, { smoothDays: 7, years })
    const july = climatology.find((d) => d.monthDay === '07-15')
    const january = climatology.find((d) => d.monthDay === '01-15')
    expect(july.tmax.median).toBeGreaterThan(january.tmax.median + 10)
    expect(july.samples).toBeGreaterThan(100)
  })
})
