import { Capacitor } from '@capacitor/core'

// Renders a quote (ayah, dhikr, hadith) as a green card image and shares it as a file.
// Returns false when the platform cannot share image files, so the caller can fall back to text.

export type ShareCardInput = { text: string; reference?: string; heading?: string; footer?: string; filename?: string }

const W = 1080
const MIN_H = 900

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  try {
    await document.fonts?.load('700 60px Amiri')
  } catch {
    // The serif fallback is fine.
  }
  const canvas = document.createElement('canvas')
  const probe = canvas.getContext('2d')
  if (!probe) return null
  const bodySize = input.text.length > 260 ? 46 : input.text.length > 120 ? 54 : 64
  const bodyFont = `700 ${bodySize}px Amiri, "Noto Naskh Arabic", serif`
  probe.font = bodyFont
  probe.direction = 'rtl'
  const lines = wrap(probe, input.text, W - 220)
  const lineHeight = Math.round(bodySize * 1.9)
  const textBlock = lines.length * lineHeight
  const H = Math.max(MIN_H, 340 + textBlock + 220)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#194b3e')
  bg.addColorStop(0.5, '#386c58')
  bg.addColorStop(1, '#173a32')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(255,255,255,0.17)'
  ctx.lineWidth = 3
  for (const [cx, cy, r] of [[W - 80, 40, 360], [60, H - 40, 300], [W / 2, H / 2, 520]] as const) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(233,200,117,0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, W - 72, H - 72)

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let y = 130
  if (input.heading) {
    ctx.fillStyle = '#e9c875'
    ctx.font = '700 40px Amiri, serif'
    ctx.fillText(input.heading, W / 2, y)
  }
  y = 230 + lineHeight / 2
  ctx.fillStyle = '#ffffff'
  ctx.font = bodyFont
  for (const line of lines) {
    ctx.fillText(line, W / 2, y)
    y += lineHeight
  }
  if (input.reference) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '600 38px Amiri, serif'
    ctx.fillText(input.reference, W / 2, y + 30)
  }
  if (input.footer) {
    ctx.fillStyle = '#e9c875'
    ctx.font = '700 36px Amiri, serif'
    ctx.fillText(input.footer, W / 2, H - 90)
  }
  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Android app: writes the PNG to the cache folder and opens the native share sheet with it. */
async function shareNative(input: ShareCardInput): Promise<boolean> {
  const blob = await renderShareCard(input)
  if (!blob) return false
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const path = `share/${Date.now()}-${input.filename ?? 'muslim-card.png'}`
    await Filesystem.writeFile({ path, data: await blobToBase64(blob), directory: Directory.Cache, recursive: true })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
    await Share.share({ files: [uri], dialogTitle: input.heading })
    return true
  } catch (error) {
    // Dismissing the sheet is normal. Any other failure lets the caller fall back to text.
    if (error instanceof Error && /cancel/i.test(error.message)) return true
    console.debug('[share] Native card share failed', error)
    return false
  }
}

/** Shares the card image (native sheet in the app, Web Share API in a browser). Resolves false when image sharing is not available here. */
export async function shareCardImage(input: ShareCardInput): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return shareNative(input)
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  const blob = await renderShareCard(input)
  if (!blob) return false
  const file = new File([blob], input.filename ?? 'muslim-card.png', { type: 'image/png' })
  if (!navigator.canShare({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title: input.heading })
  } catch (error) {
    console.debug('[share] Card share cancelled or unavailable', error)
  }
  return true
}
