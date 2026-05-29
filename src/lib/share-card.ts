import { ZEN_ACCENT, ZEN_BG, ZEN_MUTED, ZEN_TEXT } from '@/lib/mirror-colors'

export interface InsightCardInput {
  sutraOriginal: string
  reflection: string
}

const SIZE = 1080
const APP_URL = 'kennyyytu0328.github.io/PWA_SutraMind'
const SERIF = '"Noto Serif TC", serif'
const SANS = '"Noto Sans TC", sans-serif'

/** Greedy per-character wrap (CJK has no word spaces). Pure: width via `measure`. */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  if (text.length === 0) return []
  const lines: string[] = []
  let current = ''
  for (const ch of Array.from(text)) {
    const candidate = current + ch
    if (current !== '' && measure(candidate) > maxWidth) {
      lines.push(current)
      current = ch
    } else {
      current = candidate
    }
  }
  if (current !== '') lines.push(current)
  return lines
}

function lotusSvg(size: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">` +
    `<g transform="rotate(-72 60 100)"><path d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z" fill="#a8843a"/></g>` +
    `<g transform="rotate(72 60 100)"><path d="M60 100 C 42 92, 43 60, 60 50 C 77 60, 78 92, 60 100 Z" fill="#a8843a"/></g>` +
    `<g transform="rotate(-36 60 100)"><path d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z" fill="#c29a4a"/></g>` +
    `<g transform="rotate(36 60 100)"><path d="M60 100 C 40 92, 41 56, 60 46 C 79 56, 80 92, 60 100 Z" fill="#c29a4a"/></g>` +
    `<g transform="rotate(0 60 100)"><path d="M60 100 C 38 90, 40 50, 60 38 C 80 50, 82 90, 60 100 Z" fill="#dfb866"/></g>` +
    `<circle cx="60" cy="100" r="2.5" fill="#7a5a1a"/>` +
    `</svg>`
  )
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('lotus image failed to load'))
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

/** Draw centered text with manual per-character spacing (avoids ctx.letterSpacing). */
function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
): void {
  const chars = Array.from(text)
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1)
  let x = cx - total / 2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y)
    x += widths[i] + spacing
  }
  ctx.textAlign = prevAlign
}

export async function renderInsightCard(input: InsightCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not supported')

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  // ground + soft gold vignette
  ctx.fillStyle = ZEN_BG
  ctx.fillRect(0, 0, SIZE, SIZE)
  const vignette = ctx.createRadialGradient(
    SIZE / 2, SIZE * 0.42, SIZE * 0.08,
    SIZE / 2, SIZE / 2, SIZE * 0.75
  )
  vignette.addColorStop(0, 'rgba(201,169,97,0.08)')
  vignette.addColorStop(1, 'rgba(18,18,18,0)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, SIZE, SIZE)

  // gold double-line frame
  const inset = 48
  ctx.strokeStyle = ZEN_ACCENT
  ctx.lineWidth = 2
  ctx.strokeRect(inset, inset, SIZE - 2 * inset, SIZE - 2 * inset)
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  ctx.strokeRect(inset + 9, inset + 9, SIZE - 2 * (inset + 9), SIZE - 2 * (inset + 9))
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // top lotus
  const lotus = await loadSvgImage(lotusSvg(150))
  ctx.drawImage(lotus, SIZE / 2 - 75, 140, 150, 150)

  // title
  ctx.fillStyle = ZEN_MUTED
  ctx.font = `300 34px ${SERIF}`
  drawSpaced(ctx, '今日靜觀', SIZE / 2, 350, 14)

  // body fonts + wrapping
  const sutraFont = `500 50px ${SERIF}`
  const reflFont = `400 38px ${SERIF}`
  const sutraSpacing = 6
  const sutraLH = 80
  const reflLH = 64
  const GAP1 = 28 // sutra → divider
  const GAP2 = 60 // divider → reflection
  const sutraMax = SIZE - 2 * (inset + 90)
  const reflMax = SIZE - 2 * (inset + 80)

  ctx.font = sutraFont
  const sutraLines = wrapText(input.sutraOriginal, sutraMax, (s) =>
    ctx.measureText(s).width + sutraSpacing * Math.max(0, Array.from(s).length - 1)
  )
  ctx.font = reflFont
  const reflLines = wrapText(input.reflection, reflMax, (s) => ctx.measureText(s).width)

  // vertically center the text block in the region between lotus and wordmark
  const regionTop = 400
  const regionBottom = SIZE - 230
  const approxH =
    sutraLines.length * sutraLH + GAP1 + GAP2 + Math.max(0, reflLines.length - 1) * reflLH
  let y = regionTop + Math.max(0, (regionBottom - regionTop - approxH) / 2)

  // sutra
  ctx.fillStyle = ZEN_TEXT
  ctx.font = sutraFont
  for (const line of sutraLines) {
    drawSpaced(ctx, line, SIZE / 2, y, sutraSpacing)
    y += sutraLH
  }

  // divider
  y += GAP1
  ctx.strokeStyle = ZEN_ACCENT
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIZE / 2 - 40, y)
  ctx.lineTo(SIZE / 2 + 40, y)
  ctx.stroke()
  ctx.globalAlpha = 1
  y += GAP2

  // reflection
  ctx.fillStyle = ZEN_TEXT
  ctx.font = reflFont
  for (const line of reflLines) {
    ctx.fillText(line, SIZE / 2, y)
    y += reflLH
  }

  // bottom wordmark + url
  const smallLotus = await loadSvgImage(lotusSvg(44))
  ctx.drawImage(smallLotus, SIZE / 2 - 22, SIZE - 205, 44, 44)
  ctx.fillStyle = ZEN_MUTED
  ctx.font = `400 30px ${SERIF}`
  drawSpaced(ctx, '心經數位道場', SIZE / 2, SIZE - 132, 10)
  ctx.font = `400 22px ${SANS}`
  ctx.fillStyle = 'rgba(138,128,121,0.7)'
  ctx.fillText(APP_URL, SIZE / 2, SIZE - 96)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png'
    )
  })
}
