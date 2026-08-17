import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import App from '../src/App.vue'

const archiveFixture = JSON.parse(readFileSync('test/fixtures/trieste-20y.json', 'utf8'))

const TRIESTE = {
  id: 3165185,
  name: 'Trieste',
  latitude: 45.64953,
  longitude: 13.77678,
  country: 'Italy',
  country_code: 'IT',
  admin1: 'Friuli Venezia Giulia',
  timezone: 'Europe/Rome',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 366, height: 120, right: 366, bottom: 120 }
  }
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
})

let fetchCalls

beforeEach(() => {
  localStorage.clear()
  fetchCalls = []
  global.fetch = vi.fn(async (url) => {
    fetchCalls.push(String(url))
    const body = String(url).includes('geocoding') ? { results: [TRIESTE] } : archiveFixture
    return { ok: true, json: async () => body }
  })
})

function mountApp() {
  return mount(App, {
    global: {
      // Chart.js needs a real canvas, which jsdom does not provide.
      stubs: { YearComparison: true, ClimatologyChart: true },
    },
    attachTo: document.body,
  })
}

async function searchAndSelect(wrapper) {
  await wrapper.find('input[type="search"]').setValue('Triest')
  await sleep(350)
  await flushPromises()
  await wrapper.find('[role="option"] button').trigger('click')
  await flushPromises()
  await sleep(10)
  await flushPromises()
}

describe('App end to end', () => {
  it('starts on the empty state', () => {
    expect(mountApp().text()).toContain('Pick a location')
  })

  it('searches, loads the archive and shows the period statistics', async () => {
    const wrapper = mountApp()
    await searchAndSelect(wrapper)
    const text = wrapper.text()

    expect(text).toContain('Trieste')
    expect(text).toContain('Friuli Venezia Giulia')
    expect(text).toContain('What to expect')
    expect(text).toContain('Average high')
    expect(text).toContain('Rainy days')
    expect(text).toContain('How likely is it?')
    // 20 complete years of history, as configured.
    expect(text).toMatch(/Based on 20 years \(\d{4}–\d{4}\)/)
    expect(text).toMatch(/-?\d+([.,]\d+)? °C/)
  })

  it('issues exactly one archive request per location', async () => {
    const wrapper = mountApp()
    await searchAndSelect(wrapper)
    expect(fetchCalls.filter((url) => url.includes('archive-api')).length).toBe(1)
  })

  it('recomputes locally when the period changes, without fetching again', async () => {
    const wrapper = mountApp()
    await searchAndSelect(wrapper)

    const before = wrapper.text()
    await wrapper.findAll('button').find((b) => b.text() === '2 weeks').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('14 days')
    expect(wrapper.text()).not.toBe(before)
    expect(fetchCalls.filter((url) => url.includes('archive-api')).length).toBe(1)
  })

  it('remembers the place and restores it on the next visit', async () => {
    await searchAndSelect(mountApp())
    expect(JSON.parse(localStorage.getItem('hw:favourites'))[0].name).toBe('Trieste')

    const revisit = mountApp()
    await flushPromises()
    await sleep(10)
    await flushPromises()
    expect(revisit.text()).toContain('Trieste')
    expect(revisit.text()).toContain('What to expect')
  })

  it('explains an ocean coordinate instead of drawing empty charts', async () => {
    global.fetch = vi.fn(async (url) => {
      const body = String(url).includes('geocoding')
        ? { results: [TRIESTE] }
        : {
            latitude: 43,
            longitude: 5,
            daily: {
              time: archiveFixture.daily.time.slice(0, 400),
              temperature_2m_max: Array(400).fill(null),
            },
          }
      return { ok: true, json: async () => body }
    })

    const wrapper = mountApp()
    await searchAndSelect(wrapper)
    expect(wrapper.text()).toContain('No land data for this point')
  })

  it('switches the interface language', async () => {
    const wrapper = mountApp()
    await searchAndSelect(wrapper)
    await wrapper.findAll('button').find((b) => b.text() === 'DE').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Das erwartet dich')
    expect(wrapper.text()).toContain('Regentage')
  })
})
