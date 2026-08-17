// Chart.js draws to a canvas, so these run against a mocked 2D context. They
// catch configuration mistakes (scales, mixed types, plugins) that only ever
// surface at construction time.
import { describe, it, expect, beforeAll, vi } from 'vitest'

// jest-canvas-mock expects a `jest` global; give it vitest's equivalents.
globalThis.jest = { fn: vi.fn, spyOn: vi.spyOn, isMockFunction: vi.isMockFunction }
await import('jest-canvas-mock')

import { mount } from '@vue/test-utils'
import { Bar, Line } from 'vue-chartjs'
import { readFileSync } from 'node:fs'
import YearComparison from '../src/components/YearComparison.vue'
import ClimatologyChart from '../src/components/ClimatologyChart.vue'
import { normalizeArchive } from '../src/lib/openmeteo.js'
import { dayOfYearClimatology, selectYears, aggregateAllYears } from '../src/lib/aggregate.js'

const WINDOW = { startMonth: 11, startDay: 22, lengthDays: 7 }

/**
 * The live Chart.js instance. vue-chartjs builds it after mount and hands it
 * out through `expose`, which a child wrapper reaches via `$.exposed`.
 */
async function chartOf(wrapper, component) {
  await new Promise((resolve) => setTimeout(resolve, 20))
  return wrapper.findComponent(component).vm.$.exposed.chart.value
}

let climatology
let perYear

beforeAll(() => {
  const data = normalizeArchive(JSON.parse(readFileSync('test/fixtures/trieste-20y.json', 'utf8')))
  climatology = dayOfYearClimatology(data)
  perYear = aggregateAllYears(data, WINDOW, selectYears(data, WINDOW, 20))
})

describe('YearComparison', () => {
  it('builds a chart with bars, a mean line and a trend line', async () => {
    const wrapper = mount(YearComparison, { props: { perYear } })
    const chart = await chartOf(wrapper, Bar)

    expect(chart.data.labels).toHaveLength(20)
    expect(chart.data.datasets.map((d) => d.type)).toEqual(['bar', 'line', 'line'])
    // Temperature bars are floating [low, high] pairs.
    expect(chart.data.datasets[0].data[0]).toHaveLength(2)
  })

  it('switches metric without rebuilding the component', async () => {
    const wrapper = mount(YearComparison, { props: { perYear } })
    await wrapper.findAll('button').find((b) => b.text() === 'Rain').trigger('click')
    const chart = await chartOf(wrapper, Bar)

    expect(typeof chart.data.datasets[0].data[0]).toBe('number')
    expect(chart.options.scales.y.beginAtZero).toBe(true)
  })

  it('states a trend for the period', () => {
    const wrapper = mount(YearComparison, { props: { perYear } })
    expect(wrapper.text()).toMatch(/per decade|No clear trend/)
  })
})

describe('ClimatologyChart', () => {
  it('plots the window with two weeks of context on each side', async () => {
    const wrapper = mount(ClimatologyChart, { props: { climatology, window: WINDOW } })
    const chart = await chartOf(wrapper, Line)

    expect(chart.data.labels).toHaveLength(7 + 28)
    expect(chart.data.datasets).toHaveLength(5)
    // Percentile band, median lines, and rainfall on its own axis.
    expect(chart.data.datasets[1].fill).toBe('-1')
    expect(chart.data.datasets.at(-1).yAxisID).toBe('y1')
    expect(chart.options.plugins.selectionShade).toEqual({ from: 14, to: 20 })
  })

  it('wraps the context around New Year', async () => {
    const wrapper = mount(ClimatologyChart, {
      props: { climatology, window: { startMonth: 1, startDay: 2, lengthDays: 7 } },
    })
    const labels = (await chartOf(wrapper, Line)).data.labels
    expect(labels[0]).toContain('Dec')
    expect(labels.at(-1)).toContain('Jan')
  })
})
