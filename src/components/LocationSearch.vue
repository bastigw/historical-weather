<script setup>
import { ref, watch, computed } from 'vue'
import { IconSearch, IconX, IconLoader2, IconMapPin } from '@tabler/icons-vue'
import { useGeocoding } from '../composables/useGeocoding.js'
import { useLocale } from '../composables/useLocale.js'

const emit = defineEmits(['select'])

const { locale, t } = useLocale()
const { results, searching, error, search, cancel } = useGeocoding(locale)

const query = ref('')
const open = ref(false)
const highlighted = ref(0)

watch(query, (value) => {
  open.value = true
  highlighted.value = 0
  search(value)
})

// Re-running the search in the new language keeps result names consistent.
watch(locale, () => {
  if (query.value.trim().length >= 2) search(query.value)
})

const showEmpty = computed(
  () => open.value && !searching.value && !error.value && query.value.trim().length >= 2 && results.value.length === 0,
)

function choose(location) {
  emit('select', location)
  query.value = ''
  open.value = false
  cancel()
}

function onKeydown(event) {
  if (!results.value.length) return
  if (event.key === 'ArrowDown') {
    highlighted.value = (highlighted.value + 1) % results.value.length
  } else if (event.key === 'ArrowUp') {
    highlighted.value = (highlighted.value - 1 + results.value.length) % results.value.length
  } else if (event.key === 'Enter') {
    choose(results.value[highlighted.value])
  } else if (event.key === 'Escape') {
    open.value = false
  } else {
    return
  }
  event.preventDefault()
}

function clear() {
  query.value = ''
  cancel()
}
</script>

<template>
  <div class="relative">
    <label class="sr-only" for="location-search">{{ t('searchLabel') }}</label>
    <div
      class="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-3 py-2.5 focus-within:border-sky-500/70 dark:border-slate-700 dark:bg-slate-900/70 dark:focus-within:border-sky-400/70"
    >
      <IconSearch class="size-5 shrink-0 text-slate-500" />
      <input
        id="location-search"
        v-model="query"
        type="search"
        autocomplete="off"
        class="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100"
        :placeholder="t('searchPlaceholder')"
        role="combobox"
        aria-controls="location-results"
        :aria-expanded="open && results.length > 0"
        @keydown="onKeydown"
        @focus="open = true"
      />
      <IconLoader2 v-if="searching" class="size-5 shrink-0 animate-spin text-slate-500" />
      <button
        v-else-if="query"
        type="button"
        class="shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        :aria-label="t('removeFavourite')"
        @click="clear"
      >
        <IconX class="size-5" />
      </button>
    </div>

    <ul
      v-if="open && results.length"
      id="location-results"
      class="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-400/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
      role="listbox"
    >
      <li v-for="(result, i) in results" :key="result.id" role="option" :aria-selected="i === highlighted">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2.5 text-left"
          :class="
            i === highlighted
              ? 'bg-sky-400/10 text-sky-800 dark:text-sky-100'
              : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          "
          @click="choose(result)"
          @mouseenter="highlighted = i"
        >
          <IconMapPin class="size-4 shrink-0 text-slate-500" />
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ result.name }}</span>
            <span class="block truncate text-xs text-slate-600 dark:text-slate-400">
              {{ [result.admin1, result.country].filter(Boolean).join(', ') }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p v-if="showEmpty" class="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {{ t('searchNoResults') }}
    </p>
    <p v-else-if="error" class="absolute z-20 mt-2 w-full rounded-xl border border-amber-500/40 bg-white px-3 py-2.5 text-sm text-amber-700 dark:bg-slate-900 dark:text-amber-300">
      {{ t('searchError') }}
    </p>
  </div>
</template>
