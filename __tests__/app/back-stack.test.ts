import { describe, expect, it, vi } from 'vitest'
import { backHandlerCount, pushBackHandler, runTopBackHandler } from '../../src/app/backStack'
import { VIEW_HISTORY_LIMIT, recordNavigation } from '../../src/app/viewHistory'
import type { View } from '../../src/app/constants'

const home: View = { name: 'home' }
const list: View = { name: 'azkar-list' }
const cat: View = { name: 'category', id: 'morning' }
const tasbih: View = { name: 'tasbih' }
const prayer: View = { name: 'prayer-times' }

describe('back handler stack', () => {
  it('runs only the topmost handler and reports whether it consumed back', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = pushBackHandler(a)
    const offB = pushBackHandler(b)
    expect(runTopBackHandler()).toBe(true)
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
    offB()
    expect(runTopBackHandler()).toBe(true)
    expect(a).toHaveBeenCalledTimes(1)
    offA()
    expect(runTopBackHandler()).toBe(false)
    expect(backHandlerCount()).toBe(0)
  })
})

describe('view history', () => {
  it('pushes the screen we left on a forward navigation', () => {
    expect(recordNavigation([], home, prayer)).toEqual([home])
    expect(recordNavigation([home], list, cat)).toEqual([home, list])
  })

  it('ignores a navigation to the same screen', () => {
    const h = [home]
    expect(recordNavigation(h, cat, { name: 'category', id: 'morning' })).toBe(h)
  })

  it('tab taps never stack: a tab starts a fresh root', () => {
    let h: View[] = []
    let at: View = home
    for (let i = 0; i < 30; i++) {
      const to: View = i % 2 ? list : { name: 'mushaf-list' }
      h = recordNavigation(h, at, to)
      at = to
    }
    expect(h).toEqual([home])
    expect(recordNavigation(h, at, home)).toEqual([])
  })

  it('going forward to the screen we came from counts as back, not a new entry', () => {
    let h = recordNavigation([], home, tasbih)
    h = recordNavigation(h, tasbih, home) // bottom-nav root
    expect(h).toEqual([])
    const h2 = recordNavigation([home, list], cat, list)
    expect(h2).toEqual([home])
  })

  it('caps the history', () => {
    let h: View[] = []
    let at: View = { name: 'category', id: 'c0' }
    for (let i = 1; i < 200; i++) {
      const to: View = { name: 'category', id: 'c' + i }
      h = recordNavigation(h, at, to)
      at = to
    }
    expect(h.length).toBe(VIEW_HISTORY_LIMIT)
  })
})
