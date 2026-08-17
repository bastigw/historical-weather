<script setup>
import { computed, ref } from 'vue'
import { monthDayKeys } from '../lib/aggregate.js'
import { temperatureColor, PALETTE } from '../lib/colors.js'
import { formatMonthShort, formatTemperature, formatWindow } from '../lib/format.js'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  /** 366 entries from `dayOfYearClimatology`. */
  climatology: { type: Array, required: true },
  /** `{ startMonth, startDay, lengthDays }` */
  modelValue: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue'])

const { locale, t } = useLocale()

const DAYS = 366
const MIN_LENGTH = 1
const MAX_LENGTH = 92
const VIEW_HEIGHT = 100
const EDGE_GRAB_PX = 16

const KEYS = monthDayKeys()
const KEY_INDEX = new Map(KEYS.map((key, i) => [key, i]))

const PRESETS = [
  { key: 'presetDay', days: 1 },
  { key: 'presetWeek', days: 7 },
  { key: 'presetTwoWeeks', days: 14 },
  { key: 'presetMonth', days: 30 },
]

const strip = ref(null)

const pad2 = (n) => String(n).padStart(2, '0')

const startIndex = computed(
  () => KEY_INDEX.get(`${pad2(props.modelValue.startMonth)}-${pad2(props.modelValue.startDay)}`) ?? 0,
)
const length = computed(() => props.modelValue.lengthDays)

function emitWindow(index, days) {
  const wrapped = ((index % DAYS) + DAYS) % DAYS
  const [month, day] = KEYS[wrapped].split('-').map(Number)
  emit('update:modelValue', {
    startMonth: month,
    startDay: day,
    lengthDays: Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, days)),
  })
}

/* ---------------------------------------------------------------- geometry */

const domain = computed(() => {
  let low = Infinity
  let high = -Infinity
  for (const day of props.climatology) {
    if (Number.isFinite(day.tmin.p10)) low = Math.min(low, day.tmin.p10)
    if (Number.isFinite(day.tmax.p90)) high = Math.max(high, day.tmax.p90)
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) return { low: 0, high: 1 }
  const padding = Math.max(1, (high - low) * 0.08)
  return { low: low - padding, high: high + padding }
})

function toY(value) {
  const { low, high } = domain.value
  if (!Number.isFinite(value)) return VIEW_HEIGHT
  return VIEW_HEIGHT - ((value - low) / (high - low)) * VIEW_HEIGHT
}

/** Builds a closed area between an upper and a lower series. */
function areaPath(upper, lower) {
  const top = props.climatology.map((day, i) => `${i === 0 ? 'M' : 'L'}${i},${toY(upper(day))}`)
  const bottom = props.climatology
    .map((day, i) => ({ i, y: toY(lower(day)) }))
    .reverse()
    .map(({ i, y }) => `L${i},${y}`)
  return `${top.join('')}${bottom.join('')}Z`
}

const outerBand = computed(() => areaPath((d) => d.tmax.p90, (d) => d.tmin.p10))
const innerBand = computed(() => areaPath((d) => d.tmax.median, (d) => d.tmin.median))
const highLine = computed(() =>
  props.climatology.map((d, i) => `${i === 0 ? 'M' : 'L'}${i},${toY(d.tmax.median)}`).join(''),
)

/** One gradient stop per month, coloured by that month's median high. */
const gradientStops = computed(() => {
  const stops = []
  for (let month = 1; month <= 12; month++) {
    const days = props.climatology.filter((d) => d.month === month && Number.isFinite(d.tmax.median))
    if (!days.length) continue
    const mean = days.reduce((sum, d) => sum + d.tmax.median, 0) / days.length
    stops.push({
      offset: `${((days[0].index + days.length / 2) / DAYS) * 100}%`,
      color: temperatureColor(mean),
    })
  }
  return stops
})

const monthTicks = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const first = props.climatology.find((d) => d.month === i + 1)
    return {
      month: i + 1,
      label: formatMonthShort(i + 1, locale.value),
      left: ((first?.index ?? 0) / DAYS) * 100,
    }
  }),
)

/** The selection, split in two when it runs past 31 December. */
const segments = computed(() => {
  const start = startIndex.value
  const end = start + length.value // exclusive
  if (end <= DAYS) {
    return [{ left: (start / DAYS) * 100, width: (length.value / DAYS) * 100, first: true, last: true }]
  }
  return [
    { left: (start / DAYS) * 100, width: ((DAYS - start) / DAYS) * 100, first: true, last: false },
    { left: 0, width: ((end - DAYS) / DAYS) * 100, first: false, last: true },
  ]
})

const rangeLabel = computed(() => formatWindow(props.modelValue, locale.value))

const axisLabels = computed(() => ({
  high: formatTemperature(domain.value.high, locale.value, 0),
  low: formatTemperature(domain.value.low, locale.value, 0),
}))

/* ----------------------------------------------------------------- pointer */

let drag = null

function indexFromClientX(clientX) {
  const rect = strip.value.getBoundingClientRect()
  const ratio = (clientX - rect.left) / rect.width
  return Math.max(0, Math.min(DAYS - 1, Math.floor(ratio * DAYS)))
}

/** Days from the start of the selection, signed so points before it are negative. */
function relativeOffset(index) {
  const half = DAYS / 2
  return ((index - startIndex.value + DAYS + half) % DAYS) - half
}

function onPointerDown(event) {
  const rect = strip.value.getBoundingClientRect()
  const grabDays = Math.max(1, Math.round(EDGE_GRAB_PX / (rect.width / DAYS)))
  const index = indexFromClientX(event.clientX)
  const days = length.value
  const offset = relativeOffset(index)
  const inside = offset >= 0 && offset < days

  // The handles reach a little outside the selection as well as inside, but
  // never eat more than a quarter of it — a one-week window must stay draggable.
  const innerLimit = Math.floor(days / 4)
  const toStart = Math.abs(offset)
  const toEnd = Math.abs(offset - (days - 1))

  if (inside && days <= 2) {
    drag = { mode: 'move', grab: offset }
  } else if (inside && offset >= innerLimit && offset <= days - 1 - innerLimit) {
    drag = { mode: 'move', grab: offset }
  } else if (toStart <= grabDays || toEnd <= grabDays) {
    drag = { mode: toStart <= toEnd ? 'start' : 'end' }
  } else if (inside) {
    drag = { mode: 'move', grab: offset }
  } else {
    // Tapping empty calendar centres the current window on that day.
    const grab = Math.floor((days - 1) / 2)
    drag = { mode: 'move', grab }
    emitWindow(index - grab, days)
  }

  strip.value.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onPointerMove(event) {
  if (!drag) return
  const index = indexFromClientX(event.clientX)

  if (drag.mode === 'move') {
    emitWindow(index - drag.grab, length.value)
    return
  }

  if (drag.mode === 'start') {
    const endIndex = (startIndex.value + length.value - 1) % DAYS
    const days = ((endIndex - index + DAYS) % DAYS) + 1
    if (days <= MAX_LENGTH) emitWindow(index, days)
    return
  }

  const days = ((index - startIndex.value + DAYS) % DAYS) + 1
  if (days <= MAX_LENGTH) emitWindow(startIndex.value, days)
}

function endDrag(event) {
  if (!drag) return
  drag = null
  strip.value.releasePointerCapture?.(event.pointerId)
}

/* ---------------------------------------------------------------- keyboard */

function onKeydown(event) {
  const step = event.shiftKey ? 'resize' : 'move'
  const handlers = {
    ArrowLeft: () =>
      step === 'move'
        ? emitWindow(startIndex.value - 1, length.value)
        : emitWindow(startIndex.value, length.value - 1),
    ArrowRight: () =>
      step === 'move'
        ? emitWindow(startIndex.value + 1, length.value)
        : emitWindow(startIndex.value, length.value + 1),
    PageUp: () => emitWindow(startIndex.value - 7, length.value),
    PageDown: () => emitWindow(startIndex.value + 7, length.value),
    Home: () => emitWindow(0, length.value),
  }
  const handler = handlers[event.key]
  if (!handler) return
  handler()
  event.preventDefault()
}

function applyPreset(days) {
  emitWindow(startIndex.value, days)
}
</script>

<template>
  <div>
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ rangeLabel }}</p>
      <p class="text-sm text-slate-600 dark:text-slate-400">{{ t('nights', { n: modelValue.lengthDays }) }}</p>
    </div>

    <div class="relative">
      <div
        ref="strip"
        class="no-touch-scroll relative h-32 w-full cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-40 dark:border-slate-800 dark:bg-slate-950/60"
        tabindex="0"
        role="slider"
        :aria-label="t('periodTitle')"
        :aria-valuetext="`${rangeLabel}, ${t('nights', { n: modelValue.lengthDays })}`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @keydown="onKeydown"
      >
        <svg
          class="absolute inset-0 h-full w-full"
          :viewBox="`0 0 ${DAYS} ${VIEW_HEIGHT}`"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="season-ramp" x1="0" x2="1" y1="0" y2="0">
              <stop
                v-for="stop in gradientStops"
                :key="stop.offset"
                :offset="stop.offset"
                :stop-color="stop.color"
              />
            </linearGradient>
          </defs>

          <!-- Extremes stay neutral so the coloured ribbon reads as the typical day. -->
          <path :d="outerBand" fill="rgba(148, 163, 184, 0.13)" />
          <path :d="innerBand" fill="url(#season-ramp)" opacity="0.6" />
          <path
            :d="highLine"
            fill="none"
            stroke="url(#season-ramp)"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />

          <line
            v-for="tick in monthTicks"
            :key="tick.month"
            :x1="(tick.left / 100) * DAYS"
            :x2="(tick.left / 100) * DAYS"
            y1="0"
            :y2="VIEW_HEIGHT"
            :stroke="PALETTE.grid"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- Selection is HTML so handles keep their proportions and hit area. -->
        <div
          v-for="(segment, i) in segments"
          :key="i"
          class="pointer-events-none absolute inset-y-0 bg-sky-400/15 ring-1 ring-sky-300/70"
          :class="[segment.first ? 'rounded-l-md' : '', segment.last ? 'rounded-r-md' : '']"
          :style="{ left: `${segment.left}%`, width: `${segment.width}%` }"
        >
          <span
            v-if="segment.first"
            class="absolute -left-1 top-1/2 h-10 w-2 -translate-y-1/2 rounded-full bg-sky-300 shadow-lg shadow-sky-500/30"
          />
          <span
            v-if="segment.last"
            class="absolute -right-1 top-1/2 h-10 w-2 -translate-y-1/2 rounded-full bg-sky-300 shadow-lg shadow-sky-500/30"
          />
        </div>

        <span class="pointer-events-none absolute left-2 top-1 text-[11px] text-slate-600 dark:text-slate-500">
          {{ axisLabels.high }}
        </span>
        <span class="pointer-events-none absolute bottom-1 left-2 text-[11px] text-slate-600 dark:text-slate-500">
          {{ axisLabels.low }}
        </span>
      </div>

      <div class="relative mt-1 h-4 select-none">
        <span
          v-for="tick in monthTicks"
          :key="tick.month"
          class="absolute text-[11px] text-slate-600 dark:text-slate-500"
          :style="{ left: `${tick.left}%` }"
        >
          {{ tick.label }}
        </span>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-for="preset in PRESETS"
        :key="preset.key"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm transition"
        :class="
          modelValue.lengthDays === preset.days
            ? 'border-sky-500/70 bg-sky-400/15 text-sky-700 dark:border-sky-400/70 dark:text-sky-200'
            : 'border-slate-300 text-slate-700 hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
        "
        @click="applyPreset(preset.days)"
      >
        {{ t(preset.key) }}
      </button>
      <p class="ml-auto hidden text-xs text-slate-600 dark:text-slate-500 sm:block">{{ t('periodHint') }}</p>
    </div>
  </div>
</template>
