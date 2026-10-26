export const TASBIH_BUTTON_SHAPES = ['circle', 'square', 'triangle', 'hexagon'] as const
export const TASBIH_BUTTON_COLORS = ['teal', 'gold', 'blue', 'rose'] as const

export const TASBIH_PROGRESS_BOX = 184
export const TASBIH_PROGRESS_STROKE_WIDTH = 8

type Point = { x: number; y: number }

const HALF_STROKE = TASBIH_PROGRESS_STROKE_WIDTH / 2
const TRIANGLE_POINTS: readonly Point[] = [
  { x: TASBIH_PROGRESS_BOX * 0.5, y: TASBIH_PROGRESS_BOX * 0.08 },
  { x: TASBIH_PROGRESS_BOX * 0.96, y: TASBIH_PROGRESS_BOX * 0.92 },
  { x: TASBIH_PROGRESS_BOX * 0.04, y: TASBIH_PROGRESS_BOX * 0.92 },
]
const HEXAGON_POINTS: readonly Point[] = [
  { x: TASBIH_PROGRESS_BOX * 0.25, y: TASBIH_PROGRESS_BOX * 0.08 },
  { x: TASBIH_PROGRESS_BOX * 0.75, y: TASBIH_PROGRESS_BOX * 0.08 },
  { x: TASBIH_PROGRESS_BOX * 0.96, y: TASBIH_PROGRESS_BOX * 0.5 },
  { x: TASBIH_PROGRESS_BOX * 0.75, y: TASBIH_PROGRESS_BOX * 0.92 },
  { x: TASBIH_PROGRESS_BOX * 0.25, y: TASBIH_PROGRESS_BOX * 0.92 },
  { x: TASBIH_PROGRESS_BOX * 0.04, y: TASBIH_PROGRESS_BOX * 0.5 },
]

function lineIntersection(a: Point, b: Point, c: Point, d: Point): Point {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const cdx = d.x - c.x
  const cdy = d.y - c.y
  const denominator = abx * cdy - aby * cdx
  if (Math.abs(denominator) < Number.EPSILON) throw new Error('Cannot offset parallel polygon edges')
  const t = ((c.x - a.x) * cdy - (c.y - a.y) * cdx) / denominator
  return { x: a.x + t * abx, y: a.y + t * aby }
}

export function offsetConvexPolygon(points: readonly Point[], distance: number): Point[] {
  if (points.length < 3) throw new Error('A polygon needs at least three points')
  const signedArea = points.reduce(
    (sum, point, i) => {
      const next = points[(i + 1) % points.length]
      return sum + point.x * next.y - next.x * point.y
    },
    0,
  )
  const orientation = Math.sign(signedArea) || 1
  const offsetLines = points.map((point, i) => {
    const next = points[(i + 1) % points.length]
    const dx = next.x - point.x
    const dy = next.y - point.y
    const length = Math.hypot(dx, dy)
    const nx = orientation > 0 ? -dy / length : dy / length
    const ny = orientation > 0 ? dx / length : -dx / length
    return {
      a: { x: point.x + nx * distance, y: point.y + ny * distance },
      b: { x: next.x + nx * distance, y: next.y + ny * distance },
    }
  })
  return offsetLines.map((line, i) =>
    lineIntersection(
      offsetLines[(i - 1 + offsetLines.length) % offsetLines.length].a,
      offsetLines[(i - 1 + offsetLines.length) % offsetLines.length].b,
      line.a,
      line.b,
    ),
  )
}

function polygonClipPath(points: readonly Point[]): string {
  return `polygon(${points.map(({ x, y }) => `${(x / TASBIH_PROGRESS_BOX) * 100}% ${(y / TASBIH_PROGRESS_BOX) * 100}%`).join(', ')})`
}

function polygonPath(points: readonly Point[]): string {
  return `M ${points.map(({ x, y }) => `${x} ${y}`).join(' L ')} Z`
}

export function getTasbihShapePoints(shape: string): readonly Point[] | undefined {
  switch (shape) {
    case 'triangle': return TRIANGLE_POINTS
    case 'hexagon': return HEXAGON_POINTS
    default: return undefined
  }
}

export function getTasbihButtonClass(shape: string): string {
  switch (shape) {
    case 'square': return 'rounded-2xl'
    case 'triangle':
    case 'hexagon': return ''
    case 'circle':
    default: return 'rounded-full'
  }
}

export function getTasbihButtonClipPath(shape: string): string | undefined {
  const points = getTasbihShapePoints(shape)
  return points ? polygonClipPath(points) : undefined
}

export function getTasbihProgressPath(shape: string): string {
  const box = TASBIH_PROGRESS_BOX
  const center = box / 2
  const radius = center - HALF_STROKE
  switch (shape) {
    case 'square': {
      const inset = HALF_STROKE
      const size = box - inset * 2
      const radius = 16 - inset
      return `M ${inset + radius} ${inset} H ${inset + size - radius} A ${radius} ${radius} 0 0 1 ${inset + size} ${inset + radius} V ${inset + size - radius} A ${radius} ${radius} 0 0 1 ${inset + size - radius} ${inset + size} H ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset} ${inset + size - radius} V ${inset + radius} A ${radius} ${radius} 0 0 1 ${inset + radius} ${inset} Z`
    }
    case 'triangle':
      // Keep the progress cord outside the triangle, matching the visual
      // relationship used by the hexagon instead of letting the button cover it.
      return polygonPath(offsetConvexPolygon(getTasbihShapePoints(shape)!, -HALF_STROKE / 2))
    case 'hexagon':
      return polygonPath(offsetConvexPolygon(getTasbihShapePoints(shape)!, HALF_STROKE))
    case 'circle':
    default:
      return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center} ${center + radius} A ${radius} ${radius} 0 1 1 ${center} ${center - radius} Z`
  }
}

export function getTasbihButtonBackground(color: string): string {
  switch (color) {
    case 'gold': return 'radial-gradient(circle at 35% 30%, #A78BFA, #5B21B6)'
    case 'blue': return 'radial-gradient(circle at 35% 30%, #5B8DEF, #244B9A)'
    case 'rose': return 'radial-gradient(circle at 35% 30%, #E07A8D, #8E2F45)'
    case 'teal':
    default: return 'radial-gradient(circle at 35% 30%, hsl(var(--azkar-teal)), hsl(var(--azkar-teal-deep)))'
  }
}
