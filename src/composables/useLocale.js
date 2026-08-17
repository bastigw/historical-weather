import { ref, watch } from 'vue'
import { strings } from '../i18n/strings.js'

const STORAGE_KEY = 'hw:locale'

function initialLocale() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && strings[stored]) return stored
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

// Module-level state: one language for the whole app.
const locale = ref(initialLocale())
watch(locale, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
  document.documentElement.lang = value
})
document.documentElement.lang = locale.value

/**
 * Translates a key, filling `{placeholders}`. Reading `locale.value` inside
 * makes every template using `t()` re-render when the language changes.
 */
function t(key, vars) {
  const template = strings[locale.value]?.[key] ?? strings.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

export function useLocale() {
  return { locale, t }
}
