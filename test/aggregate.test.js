import { describe, it, expect } from 'vitest'
import { makeData } from './helpers/synthetic.js'
import {
  windowDatesForYear,
  selectYears,
  aggregateWindowForYear,
  aggregateAcrossYears,
  linearTrend,
  dayOfYearClimatology,
  probabilities,
  quantile,
} from '../src/lib/aggregate.js'

const win = (startMonth, startDay, lengthDays) => ({ startMonth, startDay, lengthDays })

describe('windowDatesForYear', () => {
  it('materialises a plain window', () => {
    expect(windowDatesForYear(win(11, 22, 7), 2023)).toEqual([
      '2023-11-22',
      '2023-11-23',
      '2023-11-24',
      '2023-11-25',
      '2023-11-26',
      '2023-11-27',
      '2023-11-28',
    ])
  })

  it('wraps across New Year into the following year', () => {
    expect(windowDatesForYear(win(12, 30, 4), 2023)).toEqual([
      '2023-12-30',
      '2023-12-31',
      '2024-01-01',
      '2024-01-02',
    ])
  })

  it('includes 29 February in a leap year', () => {
    expect(windowDatesForYear(win(2, 27, 4), 2024)).toEqual([
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ])
  })

  it('skips 29 February in a non-leap year', () => {
    expect(windowDatesForYear(win(2, 27, 4), 2023)).toEqual([
      '2023-02-27',
      '2023-02-28',
      '2023-03-01',
      '2023-03-02',
    ])
  })
})

describe('selectYears', () => {
  it('returns the most recent fully covered years, oldest first', () => {
    const data = makeData('2010-01-01', '2020-06-30')
    expect(selectYears(data, win(11, 22, 7), 5)).toEqual([2015, 2016, 2017, 2018, 2019])
  })

  it('drops a year whose wrapped window runs past the end of the data', () => {
    const data = makeData('2015-01-01', '2019-12-31')
    // 2019-12-30 + 4 days needs 2020-01-02, which is not in the data.
    expect(selectYears(data, win(12, 30, 4), 20)).toEqual([2015, 2016, 2017, 2018])
  })

  it('drops a leading year whose window starts before the data', () => {
    const data = makeData('2015-03-01', '2019-12-31')
    expect(selectYears(data, win(1, 10, 3), 20)).toEqual([2016, 2017, 2018, 2019])
  })
})

describe('aggregateWindowForYear', () => {
  const data = makeData('2020-01-01', '2020-01-10', {
    overrides: {
      '2020-01-01': { tmax: 1, tmin: -2, tmean: -0.5, precip: 0, cloud: 100, snow: 0, sunshineHours: 1, wind: 10 },
      '2020-01-02': { tmax: 2, tmin: 0, tmean: 1, precip: 2, cloud: 80, snow: 0, sunshineHours: 2, wind: 20 },
      '2020-01-03': { tmax: 3, tmin: 1, tmean: 2, precip: 0, cloud: 79, snow: 1, sunshineHours: 0, wind: 5 },
      '2020-01-04': { tmax: 4, tmin: -1, tmean: 1.5, precip: 5, cloud: 0, snow: 0, sunshineHours: 3, wind: 30 },
      '2020-01-05': { tmax: 5, tmin: 3, tmean: 4, precip: 0.5, cloud: 50, snow: 0, sunshineHours: 0.5, wind: 15 },
    },
  })
  const stats = aggregateWindowForYear(data, win(1, 1, 5), 2020)

  it('averages temperatures over the window', () => {
    expect(stats.tmaxMean).toBeCloseTo(3, 6)
    expect(stats.tminMean).toBeCloseTo(0.2, 6)
    expect(stats.tmaxPeak).toBeCloseTo(5, 6)
    expect(stats.tminLow).toBeCloseTo(-2, 6)
  })

  it('sums precipitation and counts wet days at the 1 mm threshold', () => {
    expect(stats.precipTotal).toBeCloseTo(7.5, 5)
    expect(stats.wetDays).toBe(2)
    expect(stats.dryDays).toBe(3)
  })

  it('counts frost, snow and overcast days', () => {
    expect(stats.frostDays).toBe(2)
    expect(stats.snowDays).toBe(1)
    expect(stats.overcastDays).toBe(2)
    expect(stats.hotDays).toBe(0)
  })

  it('reports cloud, sunshine in hours and peak wind', () => {
    expect(stats.cloudMean).toBeCloseTo(61.8, 4)
    expect(stats.sunshineTotal).toBeCloseTo(6.5, 5)
    expect(stats.sunshineMean).toBeCloseTo(1.3, 5)
    expect(stats.windMax).toBeCloseTo(30, 5)
  })

  it('reports full coverage and the day count', () => {
    expect(stats.days).toBe(5)
    expect(stats.coverage).toBe(1)
  })

  it('ignores gaps but reports reduced coverage', () => {
    const gappy = makeData('2020-01-01', '2020-01-10', {
      overrides: {
        '2020-01-01': { tmax: 10, precip: 4 },
        '2020-01-02': { tmax: null, tmin: null, tmean: null, precip: null, cloud: null },
        '2020-01-03': { tmax: 20, precip: 0 },
      },
    })
    const s = aggregateWindowForYear(gappy, win(1, 1, 3), 2020)
    expect(s.tmaxMean).toBeCloseTo(15, 6)
    expect(s.precipTotal).toBeCloseTo(4, 6)
    expect(s.coverage).toBeCloseTo(2 / 3, 6)
  })

  it('returns null when the window is not covered at all', () => {
    expect(aggregateWindowForYear(data, win(1, 1, 5), 1999)).toBeNull()
  })
})

describe('quantile', () => {
  it('interpolates linearly between order statistics', () => {
    const values = [1, 2, 3, 4, 5]
    expect(quantile(values, 0)).toBeCloseTo(1, 6)
    expect(quantile(values, 0.1)).toBeCloseTo(1.4, 6)
    expect(quantile(values, 0.25)).toBeCloseTo(2, 6)
    expect(quantile(values, 0.5)).toBeCloseTo(3, 6)
    expect(quantile(values, 0.9)).toBeCloseTo(4.6, 6)
    expect(quantile(values, 1)).toBeCloseTo(5, 6)
  })

  it('averages the middle pair for an even count', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 6)
  })
})

describe('aggregateAcrossYears', () => {
  const perYear = [1, 2, 3, 4, 5].map((v, i) => ({
    year: 2015 + i,
    tmaxMean: v,
    precipTotal: v * 10,
  }))
  const summary = aggregateAcrossYears(perYear, ['tmaxMean', 'precipTotal'])

  it('records which years went into the summary', () => {
    expect(summary.count).toBe(5)
    expect(summary.years).toEqual([2015, 2016, 2017, 2018, 2019])
  })

  it('summarises each metric', () => {
    const t = summary.metrics.tmaxMean
    expect(t.mean).toBeCloseTo(3, 6)
    expect(t.median).toBeCloseTo(3, 6)
    expect(t.p25).toBeCloseTo(2, 6)
    expect(t.p75).toBeCloseTo(4, 6)
    expect(t.min).toBeCloseTo(1, 6)
    expect(t.max).toBeCloseTo(5, 6)
    expect(summary.metrics.precipTotal.mean).toBeCloseTo(30, 6)
  })
})

describe('linearTrend', () => {
  it('reports a perfect trend per decade', () => {
    const perYear = [10, 11, 12, 13, 14].map((v, i) => ({ year: 2000 + i, tmaxMean: v }))
    const trend = linearTrend(perYear, 'tmaxMean')
    expect(trend.slopePerDecade).toBeCloseTo(10, 6)
    expect(trend.r2).toBeCloseTo(1, 6)
    expect(trend.n).toBe(5)
  })

  it('reports a flat trend as zero slope', () => {
    const perYear = [5, 5, 5, 5].map((v, i) => ({ year: 2000 + i, tmaxMean: v }))
    expect(linearTrend(perYear, 'tmaxMean').slopePerDecade).toBeCloseTo(0, 6)
  })

  it('returns null with fewer than three usable points', () => {
    expect(linearTrend([{ year: 2000, tmaxMean: 1 }], 'tmaxMean')).toBeNull()
  })
})

describe('dayOfYearClimatology', () => {
  const data = makeData('2016-01-01', '2019-12-31', {
    base: (date) => {
      const month = Number(date.slice(5, 7))
      return { tmax: month, tmin: month - 5, precip: month % 2 === 0 ? 2 : 0 }
    },
  })
  const climatology = dayOfYearClimatology(data, { smoothDays: 7 })

  it('covers every calendar day including 29 February', () => {
    expect(climatology).toHaveLength(366)
    expect(climatology[0].monthDay).toBe('01-01')
    expect(climatology.some((d) => d.monthDay === '02-29')).toBe(true)
    expect(climatology[365].monthDay).toBe('12-31')
  })

  it('reflects the underlying seasonal signal', () => {
    const july = climatology.find((d) => d.monthDay === '07-15')
    expect(july.tmax.median).toBeCloseTo(7, 6)
    expect(july.tmin.median).toBeCloseTo(2, 6)
  })

  it('smooths across the year boundary', () => {
    // 1 January is smoothed with late-December days, so it mixes month 1 and 12.
    const jan1 = climatology[0]
    expect(jan1.tmax.mean).toBeGreaterThan(1)
    expect(jan1.tmax.mean).toBeLessThan(12)
  })

  it('exposes precipitation and wet-day probability per day', () => {
    const june = climatology.find((d) => d.monthDay === '06-15')
    expect(june.precipMean).toBeCloseTo(2, 6)
    expect(june.wetProbability).toBeCloseTo(1, 6)
  })
})

describe('probabilities', () => {
  const data = makeData('2016-01-01', '2019-12-31', {
    overrides: {
      '2016-01-01': { precip: 5 },
      '2018-01-01': { precip: 2 },
      '2018-01-02': { precip: 3 },
      '2019-01-04': { precip: 1 },
    },
  })
  const result = probabilities(data, win(1, 1, 5), [2016, 2017, 2018, 2019])

  it('reports the chance that any given day is wet', () => {
    expect(result.wet.perDay).toBeCloseTo(4 / 20, 6)
  })

  it('reports the chance of at least one wet day during the stay', () => {
    expect(result.wet.atLeastOne).toBeCloseTo(3 / 4, 6)
  })

  it('reports zero for conditions that never occur', () => {
    expect(result.hot.perDay).toBe(0)
    expect(result.hot.atLeastOne).toBe(0)
  })
})
