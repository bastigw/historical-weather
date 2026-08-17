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
  [-10, [59, 130, 246]],
  [-2, [56, 189, 248]],
  [5, [103, 232, 249]],
  [11, [186, 230, 253]],
  [15, [226, 232, 240]],
  [19, [253, 224, 71]],
  [24, [251, 191, 36]],
  [29, [251, 146, 60]],
  [34, [248, 113, 113]],
]

export function temperatureColor(celsius, alpha = 1) {
  if (!Number.isFinite(celsius)) return `rgba(148, 163, 184, ${alpha})`

  const first = TEMPERATURE_RAMP[0]
  const last = TEMPERATURE_RAMP.at(-1)
  if (celsius <= first[0]) return `rgba(${first[1].join(', ')}, ${alpha})`
  if (celsius >= last[0]) return `rgba(${last[1].join(', ')}, ${alpha})`

  for (let i = 1; i < TEMPERATURE_RAMP.length; i++) {
    const [highTemp, highColor] = TEMPERATURE_RAMP[i]
    if (celsius > highTemp) continue
    const [lowTemp, lowColor] = TEMPERATURE_RAMP[i - 1]
    const ratio = (celsius - lowTemp) / (highTemp - lowTemp)
    const rgb = lowColor.map((value, c) => Math.round(value + (highColor[c] - value) * ratio))
    return `rgba(${rgb.join(', ')}, ${alpha})`
  }

  return `rgba(${last[1].join(', ')}, ${alpha})`
}
