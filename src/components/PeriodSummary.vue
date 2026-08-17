<script setup>
import { computed } from 'vue'
import { useLocale } from '../composables/useLocale.js'
import {
  formatTemperature,
  formatMillimetres,
  formatPercentValue,
  formatHours,
  formatSpeed,
  formatDays,
} from '../lib/format.js'
import { temperatureColor } from '../lib/colors.js'

const props = defineProps({
  /** Result of `aggregateAcrossYears`. */
  summary: { type: Object, required: true },
  /** `{ startMonth, startDay, lengthDays }` */
  window: { type: Object, required: true },
})

const { locale, t } = useLocale()

const metric = (name) => props.summary.metrics[name]

const glance = computed(() => ({
  high: formatTemperature(metric('tmaxMean').mean, locale.value, 0),
  low: formatTemperature(metric('tminMean').mean, locale.value, 0),
  wet: formatDays(metric('wetDays').mean, locale.value, 0),
  days: props.window.lengthDays,
}))

const range = (name, format) => {
  const m = metric(name)
  return t('typicalYears', { from: format(m.p25), to: format(m.p75) })
}

const cards = computed(() => {
  const temp = (v) => formatTemperature(v, locale.value)
  const mm = (v) => formatMillimetres(v, locale.value)
  const days = (v) => formatDays(v, locale.value)
  const total = props.window.lengthDays

  const list = [
    {
      key: 'avgHigh',
      label: t('avgHigh'),
      value: temp(metric('tmaxMean').mean),
      sub: range('tmaxMean', temp),
      color: temperatureColor(metric('tmaxMean').mean),
    },
    {
      key: 'avgLow',
      label: t('avgLow'),
      value: temp(metric('tminMean').mean),
      sub: range('tminMean', temp),
      color: temperatureColor(metric('tminMean').mean),
    },
    {
      key: 'wetDays',
      label: t('wetDays'),
      value: days(metric('wetDays').mean),
      sub: t('outOfDays', { n: total }),
    },
    {
      key: 'precipTotal',
      label: t('precipTotal'),
      value: mm(metric('precipTotal').mean),
      sub: range('precipTotal', mm),
    },
    {
      key: 'cloudCover',
      label: t('cloudCover'),
      value: formatPercentValue(metric('cloudMean').mean, locale.value),
      sub: range('cloudMean', (v) => formatPercentValue(v, locale.value)),
    },
    {
      key: 'sunshine',
      label: t('sunshine'),
      value: formatHours(metric('sunshineMean').mean, locale.value),
      sub: t('perDayUnit'),
    },
    {
      key: 'warmestDay',
      label: t('warmestDay'),
      value: temp(metric('tmaxPeak').mean),
      sub: range('tmaxPeak', temp),
      color: temperatureColor(metric('tmaxPeak').mean),
    },
    {
      key: 'coldestNight',
      label: t('coldestNight'),
      value: temp(metric('tminLow').mean),
      sub: range('tminLow', temp),
      color: temperatureColor(metric('tminLow').mean),
    },
    {
      key: 'windMax',
      label: t('windMax'),
      value: formatSpeed(metric('windMax').mean, locale.value),
      sub: range('windMax', (v) => formatSpeed(v, locale.value)),
    },
  ]

  // Cold- and heat-specific counters only earn their space when they happen.
  const conditional = [
    ['frostDays', t('frostDays')],
    ['hotDays', t('hotDays')],
    ['snowDays', t('snowDays')],
  ]
  for (const [name, label] of conditional) {
    if (metric(name).mean >= 0.05) {
      list.push({
        key: name,
        label,
        value: days(metric(name).mean),
        sub: t('outOfDays', { n: total }),
      })
    }
  }

  return list
})
</script>

<template>
  <section>
    <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
      {{ t('summaryTitle') }}
    </h2>
    <p class="mb-4 text-lg text-slate-800 dark:text-slate-200">
      {{ t('atAGlance', glance) }}
    </p>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="card in cards" :key="card.key" class="card px-3.5 py-3">
        <p class="text-xs text-slate-600 dark:text-slate-400">{{ card.label }}</p>
        <p
          class="mt-1 text-2xl font-semibold tabular-nums"
          :style="card.color ? { color: card.color } : null"
        >
          {{ card.value }}
        </p>
        <p class="mt-0.5 text-[11px] text-slate-600 dark:text-slate-500">{{ card.sub }}</p>
      </div>
    </div>
  </section>
</template>
