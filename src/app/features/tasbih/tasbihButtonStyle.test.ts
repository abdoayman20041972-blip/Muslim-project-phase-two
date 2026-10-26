import { describe, expect, it } from 'vitest'
import {
  getTasbihButtonBackground,
  getTasbihButtonClass,
  getTasbihButtonClipPath,
  getTasbihProgressPath,
  getTasbihShapePoints,
  offsetConvexPolygon,
  TASBIH_BUTTON_COLORS,
  TASBIH_BUTTON_SHAPES,
  TASBIH_PROGRESS_BOX,
  TASBIH_PROGRESS_STROKE_WIDTH,
} from './tasbihButtonStyle'

describe('tasbih button style', () => {
  it('keeps circle and unknown shapes on the existing rounded-full default', () => {
    expect(getTasbihButtonClass('circle')).toBe('rounded-full')
    expect(getTasbihButtonClass('')).toBe('rounded-full')
    expect(getTasbihButtonClass('xyz')).toBe('rounded-full')
  })

  it('keeps the exact existing teal background', () => {
    expect(getTasbihButtonBackground('teal')).toBe('radial-gradient(circle at 35% 30%, hsl(var(--azkar-teal)), hsl(var(--azkar-teal-deep)))')
  })

  it('keeps the progress geometry box and stroke constants stable', () => {
    expect(TASBIH_PROGRESS_BOX).toBe(184)
    expect(TASBIH_PROGRESS_STROKE_WIDTH).toBe(8)
  })

  it('provides defined styles for every supported shape and color', () => {
    for (const shape of TASBIH_BUTTON_SHAPES) {
      expect(getTasbihButtonClass(shape)).toBeDefined()
      expect(getTasbihProgressPath(shape)).toBeTruthy()
      if (shape === 'triangle' || shape === 'hexagon') expect(getTasbihButtonClipPath(shape)).toBeTruthy()
    }
    for (const color of TASBIH_BUTTON_COLORS) expect(getTasbihButtonBackground(color)).toBeTruthy()
  })

  it('uses distinct valid progress geometry for each supported shape', () => {
    const paths = TASBIH_BUTTON_SHAPES.map((shape) => getTasbihProgressPath(shape))
    expect(new Set(paths).size).toBe(TASBIH_BUTTON_SHAPES.length)
    for (const path of paths) {
      expect(path).toMatch(/^M .+ Z$/)
      expect(path.length).toBeGreaterThan(10)
    }
  })

  it('derives triangle and hexagon clip paths from the same shared points', () => {
    for (const shape of ['triangle', 'hexagon']) {
      const points = getTasbihShapePoints(shape)
      expect(points).toBeDefined()
      const clipPath = getTasbihButtonClipPath(shape)
      expect(clipPath).toBe(
        `polygon(${points!.map(({ x, y }) => `${(x / TASBIH_PROGRESS_BOX) * 100}% ${(y / TASBIH_PROGRESS_BOX) * 100}%`).join(', ')})`,
      )
    }
  })

  it('uses the approved relative polygon coordinates on the shared 184px box', () => {
    expect(getTasbihShapePoints('triangle')).toEqual([
      { x: TASBIH_PROGRESS_BOX * 0.5, y: TASBIH_PROGRESS_BOX * 0.08 },
      { x: TASBIH_PROGRESS_BOX * 0.96, y: TASBIH_PROGRESS_BOX * 0.92 },
      { x: TASBIH_PROGRESS_BOX * 0.04, y: TASBIH_PROGRESS_BOX * 0.92 },
    ])
    expect(getTasbihShapePoints('hexagon')).toEqual([
      { x: TASBIH_PROGRESS_BOX * 0.25, y: TASBIH_PROGRESS_BOX * 0.08 },
      { x: TASBIH_PROGRESS_BOX * 0.75, y: TASBIH_PROGRESS_BOX * 0.08 },
      { x: TASBIH_PROGRESS_BOX * 0.96, y: TASBIH_PROGRESS_BOX * 0.5 },
      { x: TASBIH_PROGRESS_BOX * 0.75, y: TASBIH_PROGRESS_BOX * 0.92 },
      { x: TASBIH_PROGRESS_BOX * 0.25, y: TASBIH_PROGRESS_BOX * 0.92 },
      { x: TASBIH_PROGRESS_BOX * 0.04, y: TASBIH_PROGRESS_BOX * 0.5 },
    ])
  })

  it('offsets a standard square inward by the requested distance', () => {
    expect(offsetConvexPolygon([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ], 1)).toEqual([
      { x: 1, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 9 },
      { x: 1, y: 9 },
    ])
  })

  it('offsets a standard triangle inward by the requested distance', () => {
    const result = offsetConvexPolygon([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ], 1)
    const expected = 9 - Math.sqrt(2)
    expect(result[0].x).toBeCloseTo(1)
    expect(result[0].y).toBeCloseTo(1)
    expect(result[1].x).toBeCloseTo(expected)
    expect(result[1].y).toBeCloseTo(1)
    expect(result[2].x).toBeCloseTo(1)
    expect(result[2].y).toBeCloseTo(expected)
  })

  it('keeps the shared polygon points inside the progress box', () => {
    for (const shape of ['triangle', 'hexagon']) {
      for (const point of getTasbihShapePoints(shape)!) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(TASBIH_PROGRESS_BOX)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(TASBIH_PROGRESS_BOX)
      }
    }
  })

  it('keeps the supported shape order unchanged', () => {
    expect(TASBIH_BUTTON_SHAPES).toEqual(['circle', 'square', 'triangle', 'hexagon'])
  })

  it('keeps the supported color ids unchanged', () => {
    expect(TASBIH_BUTTON_COLORS).toEqual(['teal', 'gold', 'blue', 'rose'])
  })
})
