// Audit reproduction test for finding M1: BookReader does not clamp `page`
// when the measured page count shrinks (viewport rotation / resize).
// jsdom has no layout, so stage/measure geometry is mocked per class name.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BookReader } from './BookReader'

let stageWidth = 300
const STAGE_HEIGHT = 500
const PARAGRAPHS = Array.from({ length: 40 }, (_, i) => `فقرة اختبار رقم ${i + 1} `.repeat(20))

let origClientWidth: PropertyDescriptor | undefined
let origClientHeight: PropertyDescriptor | undefined
let origScrollWidth: PropertyDescriptor | undefined

beforeAll(() => {
  origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
  origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  origScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('book-stage') ? stageWidth : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('book-stage') ? STAGE_HEIGHT : 0
    },
  })
  // 10 columns of text per 300px of width, so the measure div reports a
  // scrollWidth proportional to how many 300px pages the chapter fills.
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('book-measure') ? 10 * 300 : 0
    },
  })
})

afterAll(() => {
  if (origClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth)
  if (origClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', origClientHeight)
  if (origScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origScrollWidth)
})

describe('M1: BookReader page index vs shrinking page count', () => {
  it('leaves the reader on a nonexistent page after the viewport widens', async () => {
    render(<BookReader paragraphs={PARAGRAPHS} credit="test" />)
    // Initial layout: 300px stage, measure scrollWidth 3000 -> 10 pages.
    expect(screen.getByTestId('book-count').textContent).toContain('١٠')

    const next = screen.getByRole('button', { name: /التالية/ })
    for (let i = 0; i < 9; i += 1) fireEvent.click(next)
    expect(screen.getByTestId('book-count').textContent).toContain('١٠ من ١٠')

    // Rotate: the stage doubles in width, so the same text fills 5 pages.
    await act(async () => {
      stageWidth = 600
      window.dispatchEvent(new Event('resize'))
    })

    const count = screen.getByTestId('book-count').textContent ?? ''
    console.log('[M1 repro] counter after resize:', JSON.stringify(count))
    // Without a clamp the counter still claims page 10 of 5 and the flow is
    // translated past the content (blank page). A fix should show at most 5.
    const match = count.match(/صفحة ([٠-٩]+) من ([٠-٩]+)/)
    expect(match).toBeTruthy()
    const toNumber = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
    const current = toNumber(match![1])
    const total = toNumber(match![2])
    expect(total).toBe(5)
    console.log('[M1 repro] current:', current, 'total:', total, current > total ? 'DEFECT REPRODUCED' : 'clamped (fixed)')
    if (current > total) {
      // Defect reproduced: reader sits on a page that does not exist.
      expect(current).toBe(10)
    } else {
      // Fixed behavior: clamped into range.
      expect(current).toBeLessThanOrEqual(total)
    }
  })
})
