<script setup>
import { computed } from 'vue'
import { useLocale } from '../composables/useLocale.js'
import { formatPercent } from '../lib/format.js'

const props = defineProps({
  /** Result of `probabilities`. */
  probabilities: { type: Object, required: true },
})

const { locale, t } = useLocale()

const ROWS = [
  { key: 'wet', label: 'pWet', color: 'bg-blue-400' },
  { key: 'overcast', label: 'pOvercast', color: 'bg-slate-400' },
  { key: 'frost', label: 'pFrost', color: 'bg-sky-300' },
  { key: 'snow', label: 'pSnow', color: 'bg-indigo-300' },
  { key: 'hot', label: 'pHot', color: 'bg-amber-400' },
]

/** Conditions that never occur in this window are dropped, not shown as 0 %. */
const rows = computed(() =>
  ROWS.map((row) => ({ ...row, ...props.probabilities[row.key] })).filter(
    (row) => Number.isFinite(row.perDay) && (row.key === 'wet' || row.atLeastOne > 0),
  ),
)
</script>

<template>
  <section>
    <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
      {{ t('probabilitiesTitle') }}
    </h2>
    <p class="mb-4 text-sm text-slate-600 dark:text-slate-500">{{ t('probabilitiesHint') }}</p>

    <div class="card divide-y divide-slate-200 dark:divide-slate-800">
      <div class="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-500">
        <span />
        <span class="w-20 text-right">{{ t('anyDay') }}</span>
        <span class="w-20 text-right">{{ t('duringTrip') }}</span>
      </div>
      <div
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3"
      >
        <div class="min-w-0">
          <p class="truncate text-sm text-slate-800 dark:text-slate-200">{{ t(row.label) }}</p>
          <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              class="h-full rounded-full"
              :class="row.color"
              :style="{ width: `${Math.max(2, row.perDay * 100)}%` }"
            />
          </div>
        </div>
        <span class="w-20 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {{ formatPercent(row.perDay, locale) }}
        </span>
        <span class="w-20 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
          {{ formatPercent(row.atLeastOne, locale) }}
        </span>
      </div>
    </div>
  </section>
</template>
