<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { baseOptions, mergeOptions } from '../lib/charts.js'
import { PALETTE } from '../lib/colors.js'
import { monthDayKeys } from '../lib/aggregate.js'
import { useLocale } from '../composables/useLocale.js'
import { formatMonthDay, formatNumber } from '../lib/format.js'

const props = defineProps({
  /** 366 entries from `dayOfYearClimatology`. */
  climatology: { type: Array, required: true },
  /** `{ startMonth, startDay, lengthDays }` */
  window: { type: Object, required: true },
})

const { locale, t } = useLocale()

const CONTEXT_DAYS = 14
const DAYS = 366
const KEYS = monthDayKeys()
const KEY_INDEX = new Map(KEYS.map((key, i) => [key, i]))

const pad2 = (n) => String(n).padStart(2, '0')

const startIndex = computed(
  () => KEY_INDEX.get(`${pad2(props.window.startMonth)}-${pad2(props.window.startDay)}`) ?? 0,
)

/** The window plus two weeks of context on each side, wrapping at New Year. */
const slice = computed(() => {
  const total = props.window.lengthDays + CONTEXT_DAYS * 2
  const from = startIndex.value - CONTEXT_DAYS
  return Array.from({ length: total }, (_, i) => props.climatology[(((from + i) % DAYS) + DAYS) % DAYS])
})

const labels = computed(() => slice.value.map((day) => formatMonthDay(day.month, day.day, locale.value)))

/**
 * Shades the selected days so the window is readable inside the context.
 * Draws under the datasets, hence `beforeDatasetsDraw`.
 */
const selectionShade = {
  id: 'selectionShade',
  beforeDatasetsDraw(chart, _args, options) {
    const { ctx, chartArea, scales } = chart
    if (!chartArea || options.from == null) return
    const band = chartArea.width / chart.data.labels.length
    const left = scales.x.getPixelForValue(options.from) - band / 2
    const right = scales.x.getPixelForValue(options.to) + band / 2

    ctx.save()
    ctx.fillStyle = PALETTE.selection
    ctx.fillRect(left, chartArea.top, right - left, chartArea.height)
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)'
    ctx.lineWidth = 1
    for (const x of [left, right]) {
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
    }
    ctx.restore()
  },
}

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    // Dataset order drives the `fill: '-1'` relationships below.
    {
      label: 'p10',
      data: slice.value.map((d) => d.tmin.p10),
      borderWidth: 0,
      pointRadius: 0,
      fill: false,
      order: 5,
    },
    {
      label: 'p90',
      data: slice.value.map((d) => d.tmax.p90),
      borderWidth: 0,
      pointRadius: 0,
      backgroundColor: 'rgba(148, 163, 184, 0.10)',
      fill: '-1',
      order: 5,
    },
    {
      label: t('avgLow'),
      data: slice.value.map((d) => d.tmin.median),
      borderColor: PALETTE.cool,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.35,
      fill: false,
      order: 2,
    },
    {
      label: t('avgHigh'),
      data: slice.value.map((d) => d.tmax.median),
      borderColor: PALETTE.warm,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.35,
      backgroundColor: 'rgba(251, 191, 36, 0.10)',
      fill: '-1',
      order: 1,
    },
    {
      type: 'bar',
      label: t('metricPrecipitation'),
      data: slice.value.map((d) => d.precipMean),
      backgroundColor: 'rgba(96, 165, 250, 0.45)',
      borderRadius: 2,
      yAxisID: 'y1',
      order: 6,
    },
  ],
}))

const options = computed(() =>
  mergeOptions(baseOptions, {
    plugins: {
      selectionShade: { from: CONTEXT_DAYS, to: CONTEXT_DAYS + props.window.lengthDays - 1 },
      legend: {
        display: true,
        position: 'bottom',
        // The percentile helper datasets are structural, not information.
        labels: { filter: (item) => !['p10', 'p90'].includes(item.text) },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (['p10', 'p90'].includes(context.dataset.label)) return null
            const unit = context.dataset.yAxisID === 'y1' ? 'mm' : '°C'
            return `${context.dataset.label}: ${formatNumber(context.raw, locale.value, 1)} ${unit}`
          },
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (value) => `${formatNumber(value, locale.value, 0)} °C` },
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: { callback: (value) => `${formatNumber(value, locale.value, 0)} mm` },
      },
    },
  }),
)
</script>

<template>
  <section>
    <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
      {{ t('climatologyTitle') }}
    </h2>
    <p class="mb-3 text-sm text-slate-600 dark:text-slate-500">{{ t('climatologyHint') }}</p>

    <div class="card p-3">
      <div class="h-64 sm:h-80">
        <Line :data="chartData" :options="options" :plugins="[selectionShade]" />
      </div>
    </div>
  </section>
</template>
