<script setup>
import { IconLoader2 } from '@tabler/icons-vue'
import { useLocale } from '../composables/useLocale.js'

const { t } = useLocale()
</script>

<template>
  <div class="card flex flex-col items-center gap-3 px-6 py-14 text-center">
    <IconLoader2 class="size-8 animate-spin text-sky-500 dark:text-sky-400" />
    <p class="text-sm text-slate-600 dark:text-slate-400">{{ t('loadingArchive') }}</p>
  </div>
</template>
