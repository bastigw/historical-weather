/** Shared palette. Kept in one place so the strip and the charts agree. */

export const PALETTE = {
  warm: '#fbbf24', // amber-400 — daily highs
  cool: '#38bdf8', // sky-400 — daily lows
  rain: '#60a5fa', // blue-400
  sun: '#facc15', // yellow-400
  cloud: '#94a3b8', // slate-400
  trend: '#f472b6', // pink-400
  grid: 'rgba(148, 163, 184, 0.14)',
  axis: '#94a3b8',
  selection: 'rgba(56, 189, 248, 0.12)',
}

/**
 * Cold-to-hot ramp, in °C. It runs blue → pale → amber → red rather than
 * through green, which would read as "mild vegetation" instead of "cold", and
 * every stop stays light enough to be legible on the dark background.
 */
const TEMPERATURE_RAMP = [
  [-15, '#1d4ed8'],
  [-8, '#3b82f6'],
  [-2, '#38bdf8'],
  [5, '#67e8f9'],
  [8, '#bae6fd'],
  [11, '#e2e8f0'],
  [15, '#fcd34d'],
  [19, '#fbbf24'],
  [23, '#fb923c'],
  [28, '#f87171'],
  [32, '#dc2626'],
]

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

export function temperatureColor(celsius, alpha = 1) {
  if (!Number.isFinite(celsius)) return `rgba(148, 163, 184, ${alpha})`

  const first = TEMPERATURE_RAMP[0]
  const last = TEMPERATURE_RAMP.at(-1)
  if (celsius <= first[0])
    return `rgba(${hexToRgb(first[1]).join(', ')}, ${alpha})`
  if (celsius >= last[0])
    return `rgba(${hexToRgb(last[1]).join(', ')}, ${alpha})`

  for (let i = 1; i < TEMPERATURE_RAMP.length; i++) {
    const [highTemp, highHex] = TEMPERATURE_RAMP[i]
    if (celsius > highTemp) continue
    const [lowTemp, lowHex] = TEMPERATURE_RAMP[i - 1]
    const highColor = hexToRgb(highHex)
    const lowColor = hexToRgb(lowHex)
    const ratio = (celsius - lowTemp) / (highTemp - lowTemp)
    const rgb = lowColor.map((value, c) =>
      Math.round(value + (highColor[c] - value) * ratio),
    )
    return `rgba(${rgb.join(', ')}, ${alpha})`
  }

  return `rgba(${hexToRgb(last[1]).join(', ')}, ${alpha})`
}
