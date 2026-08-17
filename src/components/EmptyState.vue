<script setup>
import { IconCalendarSearch } from '@tabler/icons-vue'
import { useLocale } from '../composables/useLocale.js'

const { t } = useLocale()
</script>

<template>
  <div class="card flex flex-col items-center gap-3 px-6 py-14 text-center">
    <IconCalendarSearch class="size-10 text-slate-300 dark:text-slate-600" />
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-200">{{ t('emptyTitle') }}</h2>
    <p class="max-w-md text-sm text-slate-600 dark:text-slate-400">{{ t('emptyBody') }}</p>
  </div>
</template>
