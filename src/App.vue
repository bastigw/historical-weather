<script setup>
import { computed, ref, watch } from 'vue'
import { IconAlertTriangle, IconDatabase } from '@tabler/icons-vue'

import LocationSearch from './components/LocationSearch.vue'
import FavouriteList from './components/FavouriteList.vue'
import LanguageSwitch from './components/LanguageSwitch.vue'
import YearStrip from './components/YearStrip.vue'
import PeriodSummary from './components/PeriodSummary.vue'
import ProbabilityPanel from './components/ProbabilityPanel.vue'
import YearComparison from './components/YearComparison.vue'
import ClimatologyChart from './components/ClimatologyChart.vue'
import EmptyState from './components/EmptyState.vue'
import LoadingState from './components/LoadingState.vue'

import { useLocale } from './composables/useLocale.js'
import { useArchive } from './composables/useArchive.js'
import { useFavourites } from './composables/useFavourites.js'
import {
  dayOfYearClimatology,
  selectYears,
  aggregateAllYears,
  aggregateAcrossYears,
  probabilities,
} from './lib/aggregate.js'
import { HISTORY_YEARS } from './lib/openmeteo.js'
import { formatCoordinate, locationLabel } from './lib/format.js'

const STORAGE_KEY = 'hw:last'

const { locale, t } = useLocale()
const { data, loading, error, fromCache, load } = useArchive()
const { favourites, remember, forget } = useFavourites()

function defaultWindow() {
  const today = new Date()
  return { startMonth: today.getMonth() + 1, startDay: today.getDate(), lengthDays: 7 }
}

function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (stored?.location?.latitude != null) return stored
  } catch {
    /* fall through to defaults */
  }
  return null
}

const restored = restore()
const location = ref(restored?.location ?? null)
const travelWindow = ref(restored?.window ?? defaultWindow())

if (location.value) load(location.value)

watch([location, travelWindow], () => {
  if (!location.value) return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ location: location.value, window: travelWindow.value }),
  )
})

function selectLocation(place) {
  location.value = place
  remember(place)
  load(place)
}

function removeFavourite(place) {
  forget(place)
}

/* ------------------------------------------------------------- statistics */

// The seasonal backdrop uses every year in the file and therefore only has to
// be recomputed when the location changes, not while dragging the window.
const climatology = computed(() =>
  data.value ? dayOfYearClimatology(data.value, { smoothDays: 7 }) : null,
)

const years = computed(() =>
  data.value ? selectYears(data.value, travelWindow.value, HISTORY_YEARS) : [],
)
const perYear = computed(() =>
  data.value ? aggregateAllYears(data.value, travelWindow.value, years.value) : [],
)
const summary = computed(() => (perYear.value.length ? aggregateAcrossYears(perYear.value) : null))
const risk = computed(() =>
  data.value && years.value.length ? probabilities(data.value, travelWindow.value, years.value) : null,
)

const basedOn = computed(() =>
  years.value.length
    ? t('basedOn', { n: years.value.length, from: years.value[0], to: years.value.at(-1) })
    : '',
)

const gridPoint = computed(() =>
  data.value
    ? t('gridPoint', {
        lat: formatCoordinate(data.value.latitude, locale.value),
        lon: formatCoordinate(data.value.longitude, locale.value),
        elevation: Math.round(data.value.elevation ?? 0),
      })
    : '',
)

const errorMessage = computed(() =>
  error.value === 'no-land' ? t('errorNoLand') : t('errorGeneric'),
)
</script>

<template>
  <div class="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-16 pt-6 standalone:pt-12 sm:px-6">
    <header class="mb-5">
      <div class="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{{ t('appTitle') }}</h1>
          <p class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{{ t('tagline') }}</p>
        </div>
        <LanguageSwitch />
      </div>

      <LocationSearch @select="selectLocation" />

      <div class="mt-3">
        <FavouriteList
          :favourites="favourites"
          :active-id="location?.id ?? null"
          @select="selectLocation"
          @remove="removeFavourite"
        />
      </div>
    </header>

    <main class="space-y-8">
      <EmptyState v-if="!location" />
      <LoadingState v-else-if="loading" />

      <div v-else-if="error" class="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <IconAlertTriangle class="size-8 text-amber-500 dark:text-amber-400" />
        <p class="text-sm text-slate-700 dark:text-slate-300">{{ errorMessage }}</p>
        <button
          type="button"
          class="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:border-slate-500 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400"
          @click="load(location)"
        >
          {{ t('retry') }}
        </button>
      </div>

      <template v-else-if="data && climatology && summary && risk">
        <section>
          <div class="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ locationLabel(location) }}</h2>
            <span class="text-xs text-slate-600 dark:text-slate-500">{{ gridPoint }}</span>
            <span
              v-if="fromCache"
              class="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            >
              <IconDatabase class="size-3" />
              {{ t('savedOffline') }}
            </span>
          </div>

          <div class="card p-4">
            <p class="mb-3 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-500">
              {{ t('periodTitle') }} · {{ basedOn }}
            </p>
            <YearStrip v-model="travelWindow" :climatology="climatology" />
          </div>
        </section>

        <PeriodSummary :summary="summary" :window="travelWindow" />
        <ProbabilityPanel :probabilities="risk" />
        <YearComparison :per-year="perYear" />
        <ClimatologyChart :climatology="climatology" :window="travelWindow" />
      </template>
    </main>

    <footer class="mt-12 space-y-1 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-500">
      <p>{{ t('footerDisclaimer') }}</p>
      <p>
        {{ t('footerSource') }}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-slate-300 underline-offset-2 hover:text-slate-900 dark:decoration-slate-700 dark:hover:text-slate-300"
          >open-meteo.com</a
        >
      </p>
    </footer>
  </div>
</template>
