<script setup>
import { useLocale } from '../composables/useLocale.js'
import { LOCALES } from '../i18n/strings.js'

const { locale, t } = useLocale()
</script>

<template>
  <div
    class="flex shrink-0 items-center gap-0.5 rounded-full border border-slate-300 p-0.5 dark:border-slate-700"
    role="group"
    :aria-label="t('language')"
  >
    <button
      v-for="option in LOCALES"
      :key="option.code"
      type="button"
      class="rounded-full px-2.5 py-1 text-xs font-medium transition"
      :class="
        locale === option.code
          ? 'bg-slate-700 text-slate-100'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      "
      :aria-pressed="locale === option.code"
      @click="locale = option.code"
    >
      {{ option.code.toUpperCase() }}
    </button>
  </div>
</template>
