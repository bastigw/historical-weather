<script setup>
import { IconX } from '@tabler/icons-vue'
import { useLocale } from '../composables/useLocale.js'

defineProps({
  favourites: { type: Array, required: true },
  activeId: { type: [Number, String], default: null },
})
const emit = defineEmits(['select', 'remove'])

const { t } = useLocale()
</script>

<template>
  <div v-if="favourites.length" class="flex flex-wrap items-center gap-2">
    <span class="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-500">{{ t('favourites') }}</span>
    <span
      v-for="place in favourites"
      :key="place.id"
      class="group inline-flex items-center rounded-full border transition"
      :class="
        place.id === activeId
          ? 'border-sky-500/70 bg-sky-400/10 text-sky-700 dark:border-sky-400/70 dark:text-sky-200'
          : 'border-slate-300 text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300'
      "
    >
      <button type="button" class="py-1 pl-3 pr-1.5 text-sm" @click="emit('select', place)">
        {{ place.name }}
        <span class="text-slate-500">{{ place.country_code }}</span>
      </button>
      <button
        type="button"
        class="py-1 pr-2 pl-0.5 text-slate-400 hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-300"
        :aria-label="`${t('removeFavourite')}: ${place.name}`"
        @click="emit('remove', place)"
      >
        <IconX class="size-3.5" />
      </button>
    </span>
  </div>
</template>
