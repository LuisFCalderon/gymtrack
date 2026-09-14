/**
 * Genera los iconos PNG de la PWA sin dependencias externas:
 * fondo sólido + mancuerna dibujada por píxeles y codificada a PNG con zlib.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Buffer } from 'node:buffer'

const BG = [11, 11, 13]
const FG = [255, 92, 51]

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y][x]
      raw[rowStart + 1 + x * 3] = r
      raw[rowStart + 2 + x * 3] = g
      raw[rowStart + 3 + x * 3] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Mancuerna centrada, expresada en fracciones del lienzo para escalar a cualquier tamaño. */
function drawIcon(size, glyphScale) {
  const pixels = Array.from({ length: size }, () => Array.from({ length: size }, () => BG))
  const c = size / 2
  const s = size * glyphScale

  const bars = [
    // [ancho, alto] relativos al glifo, y desplazamiento horizontal
    { w: 0.13, h: 0.62, dx: -0.36 },
    { w: 0.13, h: 0.62, dx: 0.36 },
    { w: 0.11, h: 0.42, dx: -0.5 },
    { w: 0.11, h: 0.42, dx: 0.5 },
    { w: 0.74, h: 0.2, dx: 0 },
  ]

  for (const bar of bars) {
    const halfW = (bar.w * s) / 2
    const halfH = (bar.h * s) / 2
    const cx = c + bar.dx * s
    const radius = Math.min(halfW, halfH) * 0.55
    for (let y = Math.floor(c - halfH); y <= Math.ceil(c + halfH); y++) {
      for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const dx = Math.abs(x - cx) - (halfW - radius)
        const dy = Math.abs(y - c) - (halfH - radius)
        // Distancia firmada a un rectángulo redondeado: fuera de las esquinas
        // basta con quedar dentro del radio.
        const inside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= radius
        if (inside) pixels[y][x] = FG
      }
    }
  }
  return pixels
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })

const outputs = [
  ['icon-192.png', 192, 0.62],
  ['icon-512.png', 512, 0.62],
  ['maskable-512.png', 512, 0.46], // glifo dentro de la zona segura del recorte
]

for (const [name, size, scale] of outputs) {
  const file = new URL(`../public/icons/${name}`, import.meta.url)
  writeFileSync(file, encodePng(size, drawIcon(size, scale)))
  console.log('✓', name, `${size}×${size}`)
}
