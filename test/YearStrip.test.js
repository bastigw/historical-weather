import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import YearStrip from '../src/components/YearStrip.vue'
import { normalizeArchive } from '../src/lib/openmeteo.js'
import { dayOfYearClimatology } from '../src/lib/aggregate.js'

const STRIP_WIDTH = 366 // one pixel per day keeps the pointer maths readable

beforeAll(() => {
  // jsdom has no layout, so the strip would measure zero pixels wide.
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: STRIP_WIDTH, height: 120, right: STRIP_WIDTH, bottom: 120 }
  }
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

const climatology = dayOfYearClimatology(
  normalizeArchive(JSON.parse(readFileSync('test/fixtures/trieste-20y.json', 'utf8'))),
)

function mountStrip(window = { startMonth: 11, startDay: 22, lengthDays: 7 }) {
  return mount(YearStrip, { props: { climatology, modelValue: window } })
}

const strip = (wrapper) => wrapper.find('[role="slider"]')
const lastWindow = (wrapper) => wrapper.emitted('update:modelValue').at(-1)[0]

describe('YearStrip', () => {
  it('renders the season band and month labels', () => {
    const wrapper = mountStrip()
    expect(wrapper.findAll('path').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text()).toContain('Jan')
    expect(wrapper.text()).toContain('Dec')
  })

  it('shows the selected range and its length', () => {
    expect(mountStrip().text()).toContain('22 Nov')
    expect(mountStrip().text()).toContain('7 days')
  })

  it('moves the window when dragged by its middle', async () => {
    const wrapper = mountStrip()
    // 22 November is day index 326 in a leap-year calendar; grab the middle.
    await strip(wrapper).trigger('pointerdown', { clientX: 329, pointerId: 1 })
    await strip(wrapper).trigger('pointermove', { clientX: 339, pointerId: 1 })
    expect(lastWindow(wrapper)).toEqual({ startMonth: 12, startDay: 2, lengthDays: 7 })
  })

  it('lengthens the period when the right edge is dragged', async () => {
    const wrapper = mountStrip()
    await strip(wrapper).trigger('pointerdown', { clientX: 332, pointerId: 1 })
    await strip(wrapper).trigger('pointermove', { clientX: 339, pointerId: 1 })
    expect(lastWindow(wrapper).lengthDays).toBe(14)
    expect(lastWindow(wrapper).startDay).toBe(22)
  })

  it('centres the window on a tap outside the selection', async () => {
    const wrapper = mountStrip()
    // Day index 100 is 10 April; a 7-day window centred there starts on the 7th.
    await strip(wrapper).trigger('pointerdown', { clientX: 100, pointerId: 1 })
    expect(lastWindow(wrapper)).toEqual({ startMonth: 4, startDay: 7, lengthDays: 7 })
  })

  it('moves and resizes with the keyboard', async () => {
    const wrapper = mountStrip()
    await strip(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(lastWindow(wrapper)).toEqual({ startMonth: 11, startDay: 23, lengthDays: 7 })

    await strip(wrapper).trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(lastWindow(wrapper).lengthDays).toBe(8)
  })

  it('applies a preset length', async () => {
    const wrapper = mountStrip()
    await wrapper.findAll('button').find((b) => b.text() === '2 weeks').trigger('click')
    expect(lastWindow(wrapper)).toEqual({ startMonth: 11, startDay: 22, lengthDays: 14 })
  })

  it('wraps a window across New Year into two segments', () => {
    const wrapper = mountStrip({ startMonth: 12, startDay: 28, lengthDays: 10 })
    expect(wrapper.text()).toContain('28 Dec')
    expect(wrapper.text()).toContain('6 Jan')
    expect(wrapper.findAll('.ring-sky-300\\/70')).toHaveLength(2)
  })
})
