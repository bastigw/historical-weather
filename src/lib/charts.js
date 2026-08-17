/** One-time Chart.js registration plus the options every chart shares. */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { PALETTE } from './colors.js'

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
)

Chart.defaults.color = PALETTE.axis
Chart.defaults.font.family =
  "'Outfit Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
Chart.defaults.font.size = 12

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle' },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(148, 163, 184, 0.25)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: { color: PALETTE.grid, drawTicks: false },
      border: { display: false },
      ticks: { maxRotation: 0, autoSkipPadding: 12 },
    },
    y: {
      grid: { color: PALETTE.grid, drawTicks: false },
      border: { display: false },
      ticks: { padding: 6 },
    },
  },
}

/** Deep-merges chart option objects; arrays and scalars are replaced. */
export function mergeOptions(...sources) {
  const output = {}
  for (const source of sources) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = mergeOptions(output[key] ?? {}, value)
      } else {
        output[key] = value
      }
    }
  }
  return output
}

export { Chart }
