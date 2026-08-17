<script setup>
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { baseOptions, mergeOptions } from '../lib/charts.js'
import { PALETTE, temperatureColor } from '../lib/colors.js'
import { linearTrend } from '../lib/aggregate.js'
import { useLocale } from '../composables/useLocale.js'
import { formatNumber } from '../lib/format.js'

const props = defineProps({
  /** Per-year statistics, oldest first. */
  perYear: { type: Array, required: true },
})

const { locale, t } = useLocale()

const METRICS = {
  temperature: { field: 'tmaxMean', label: 'metricTemperature', unit: '°C', digits: 1 },
  precipitation: { field: 'precipTotal', label: 'metricPrecipitation', unit: 'mm', digits: 0 },
  sunshine: { field: 'sunshineMean', label: 'metricSunshine', unit: 'h', digits: 1 },
  cloud: { field: 'cloudMean', label: 'metricCloud', unit: '%', digits: 0 },
}

const selected = ref('temperature')
const metric = computed(() => METRICS[selected.value])

const years = computed(() => props.perYear.map((y) => y.year))
const values = computed(() => props.perYear.map((y) => y[metric.value.field]))
const mean = computed(() => values.value.reduce((a, b) => a + b, 0) / values.value.length)
const trend = computed(() => linearTrend(props.perYear, metric.value.field))

const barColor = computed(() => {
  if (selected.value === 'temperature') return props.perYear.map((y) => temperatureColor(y.tmaxMean, 0.85))
  const flat = { precipitation: PALETTE.rain, sunshine: PALETTE.sun, cloud: PALETTE.cloud }
  return flat[selected.value]
})

const chartData = computed(() => {
  const datasets = [
    {
      type: 'bar',
      label: t(metric.value.label),
      // Temperature shows the full daily swing rather than a single number.
      data:
        selected.value === 'temperature'
          ? props.perYear.map((y) => [y.tminMean, y.tmaxMean])
          : values.value,
      backgroundColor: barColor.value,
      borderRadius: 4,
      borderSkipped: false,
      order: 3,
    },
    {
      type: 'line',
      label: t('meanLine', { n: props.perYear.length }),
      data: years.value.map(() => mean.value),
      borderColor: 'rgba(100, 116, 139, 0.6)',
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      order: 1,
    },
  ]

  if (trend.value) {
    datasets.push({
      type: 'line',
      label: t('trendLine'),
      data: years.value.map((year) => trend.value.intercept + trend.value.slopePerYear * year),
      borderColor: PALETTE.trend,
      borderWidth: 2,
      pointRadius: 0,
      order: 2,
    })
  }

  return { labels: years.value, datasets }
})

const options = computed(() =>
  mergeOptions(baseOptions, {
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const raw = context.raw
            const digits = metric.value.digits
            if (Array.isArray(raw)) {
              return `${formatNumber(raw[1], locale.value, digits)} / ${formatNumber(
                raw[0],
                locale.value,
                digits,
              )} ${metric.value.unit}`
            }
            return `${context.dataset.label}: ${formatNumber(raw, locale.value, digits)} ${
              metric.value.unit
            }`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: selected.value !== 'temperature',
        ticks: {
          callback: (value) => `${formatNumber(value, locale.value, 0)} ${metric.value.unit}`,
        },
      },
    },
  }),
)

/** Turns the fitted slope into a sentence, or admits there is no signal. */
const trendText = computed(() => {
  if (!trend.value) return t('trendFlat')
  const slope = trend.value.slopePerDecade
  const negligible = { temperature: 0.1, precipitation: 2, sunshine: 0.1, cloud: 0.5 }
  if (trend.value.r2 < 0.05 || Math.abs(slope) < negligible[selected.value]) return t('trendFlat')

  const value = formatNumber(Math.abs(slope), locale.value, metric.value.digits)
  if (selected.value === 'temperature') {
    return t(slope > 0 ? 'trendWarming' : 'trendCooling', { value })
  }
  if (selected.value === 'precipitation') {
    return t(slope > 0 ? 'trendWetter' : 'trendDrier', { value })
  }
  const sign = slope > 0 ? '+' : '−'
  return t('trendPerDecade', { value: `${sign}${value}`, unit: metric.value.unit })
})
</script>

<template>
  <section>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          {{ t('yearsTitle') }}
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-500">{{ t('yearsHint', { n: perYear.length }) }}</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(config, key) in METRICS"
          :key="key"
          type="button"
          class="rounded-full border px-3 py-1 text-xs transition"
          :class="
            selected === key
              ? 'border-sky-500/70 bg-sky-400/15 text-sky-700 dark:border-sky-400/70 dark:text-sky-200'
              : 'border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          "
          @click="selected = key"
        >
          {{ t(config.label) }}
        </button>
      </div>
    </div>

    <div class="card p-3">
      <div class="h-64 sm:h-72">
        <Bar :data="chartData" :options="options" />
      </div>
      <p class="mt-2 px-1 text-xs text-slate-600 dark:text-slate-500">
        <span class="font-medium text-pink-700 dark:text-pink-300">{{ trendText }}</span>
      </p>
    </div>
  </section>
</template>
