/**
 * Draws the app icons: a seasonal temperature ribbon on a night-sky square,
 * the same idea as the year strip in the app.
 *
 * Run with `node scripts/generate-icons.mjs`. Rasterising here avoids adding an
 * image toolchain just to produce four static files.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/* ------------------------------------------------------------ PNG encoding */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --------------------------------------------------------------- the image */

const BACKGROUND = [11, 18, 32]
const COOL = [56, 189, 248]
const WARM = [251, 191, 36]

const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t)

/** Signed distance to a rounded square, used to mask the plain icon's corners. */
function roundedSquareAlpha(x, y, size, radius) {
  const cx = Math.abs(x - size / 2) - (size / 2 - radius)
  const cy = Math.abs(y - size / 2) - (size / 2 - radius)
  const distance =
    Math.min(Math.max(cx, cy), 0) + Math.hypot(Math.max(cx, 0), Math.max(cy, 0)) - radius
  return Math.max(0, Math.min(1, 0.5 - distance))
}

function draw(size, { maskable }) {
  const pixels = Buffer.alloc(size * size * 4)
  const radius = size * 0.22
  // Maskable icons must survive an aggressive circular crop, so the artwork
  // is scaled into the safe zone instead of running to the edges.
  const scale = maskable ? 0.62 : 0.86
  const amplitude = size * 0.13 * scale
  const thickness = size * 0.17 * scale
  const width = size * scale
  const left = (size - width) / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let colour = BACKGROUND
      let alpha = maskable ? 1 : roundedSquareAlpha(x, y, size, radius)

      const position = (x - left) / width
      if (position >= 0 && position <= 1) {
        const phase = Math.sin((position - 0.25) * Math.PI * 2)
        const centre = size / 2 - amplitude * phase
        const distance = Math.abs(y - centre)
        const ribbon = mix(COOL, WARM, (phase + 1) / 2)

        if (distance < thickness / 2) {
          colour = ribbon
        } else if (distance < thickness * 1.6) {
          // A soft halo below and above, echoing the percentile band.
          const fade = 1 - (distance - thickness / 2) / (thickness * 1.1)
          colour = mix(BACKGROUND, ribbon, fade * 0.35)
        }
      }

      pixels[i] = Math.round(colour[0])
      pixels[i + 1] = Math.round(colour[1])
      pixels[i + 2] = Math.round(colour[2])
      pixels[i + 3] = Math.round(alpha * 255)
    }
  }

  return encodePNG(size, size, pixels)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'icon-192.png'), draw(192, { maskable: false }))
writeFileSync(join(OUT, 'icon-512.png'), draw(512, { maskable: false }))
writeFileSync(join(OUT, 'icon-512-maskable.png'), draw(512, { maskable: true }))

/** Same ribbon mark; only the background swaps between the dark and light variants. */
function favicon(background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${background}"/>
  <path d="M6 40C14 40 14 24 22 24s8 16 16 16 8-16 16-16" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round"/>
  <defs>
    <linearGradient id="g" x1="6" y1="32" x2="58" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
</svg>
`
}
writeFileSync(join(OUT, 'favicon.svg'), favicon('#0b1220'))
writeFileSync(join(OUT, 'favicon-light.svg'), favicon('#f8fafc'))

console.log('Icons written to public/')
