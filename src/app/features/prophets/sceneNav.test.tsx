import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_KEYS, SETTINGS_RESET_KEYS, APP_SETTINGS_KEYS } from '../../settings'
import { ScreenActiveContext } from '../../backStack'
import { isBackupKey } from '../../settings'
import { validateBackupEntries } from '../../backupValidation'
import { StoryBody } from './StoryBody'
import { readPosition, resumeScene, savePosition } from './readerPosition'
import type { StoryContent } from './storyTypes'

const content: StoryContent = {
  id: 'demo',
  scenes: ['أ', 'ب', 'ج', 'د', 'هـ'].map((h) => ({ h, p: [{ k: 'n', t: 'نص ' + h }], v: [] })),
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('reading position by stable ids', () => {
  it('saves by story id and scene heading, and is in backups but not in the reset list', () => {
    savePosition('demo', 'ج')
    expect(JSON.parse(localStorage.getItem(APP_SETTINGS_KEYS.prophetPosition)!)).toEqual({ demo: 'ج' })
    expect(readPosition('demo')).toBe('ج')
    expect(BACKUP_KEYS.has(APP_SETTINGS_KEYS.prophetPosition)).toBe(true)
    expect(SETTINGS_RESET_KEYS).not.toContain(APP_SETTINGS_KEYS.prophetPosition)
  })
  it('handles missing, first-scene and corrupt data', () => {
    expect(resumeScene('demo', ['أ', 'ب'])).toBeNull()
    savePosition('demo', 'أ')
    expect(resumeScene('demo', ['أ', 'ب'])).toBeNull() // first scene: nothing to resume
    savePosition('demo', 'محذوف')
    expect(resumeScene('demo', ['أ', 'ب'])).toBeNull() // scene no longer exists
    localStorage.setItem(APP_SETTINGS_KEYS.prophetPosition, '{bad json')
    expect(readPosition('demo')).toBeNull()
    localStorage.setItem(APP_SETTINGS_KEYS.prophetPosition, '[1,2]')
    expect(readPosition('demo')).toBeNull()
  })
  it('survives reordering: the saved heading is found at its new index', () => {
    savePosition('demo', 'ج')
    expect(resumeScene('demo', ['ج', 'أ', 'ب'])).toBeNull() // now first
    expect(resumeScene('demo', ['أ', 'ب', 'ج'])).toBe('ج')
    expect(resumeScene('demo', ['ب', 'أ', 'د', 'ج'])).toBe('ج')
  })
})

describe('scene index and resume in the reader', () => {
  it('does not save anything just by opening a story', () => {
    render(<StoryBody content={content} fontClass="" />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(localStorage.getItem(APP_SETTINGS_KEYS.prophetPosition)).toBeNull()
  })
  it('lists the scenes and jumps to the chosen one', () => {
    render(<StoryBody content={content} fontClass="" />)
    fireEvent.click(screen.getByText('فهرس المشاهد (5)'))
    fireEvent.click(screen.getByRole('button', { name: 'ج' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(screen.queryByText('إخفاء فهرس المشاهد')).toBeNull()
  })
  it('offers "continue from" for a saved scene and scrolls to it', () => {
    savePosition('demo', 'د')
    render(<StoryBody content={content} fontClass="" />)
    fireEvent.click(screen.getByText('تابع من: د'))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(screen.queryByText('تابع من: د')).toBeNull()
  })
  it('saves the scene at the top of the screen after the user scrolls', () => {
    const { container } = render(<StoryBody content={content} fontClass="" />)
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-scene]'))
    items.forEach((el, i) => {
      el.getBoundingClientRect = () => ({ top: (i - 2) * 300 + 100 }) as DOMRect // scene 'ج' (index 2) is at the top
    })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(500)
    })
    expect(readPosition('demo')).toBe('ج')
  })
})

describe('hidden kept-alive screens', () => {
  const place = (container: HTMLElement, zero: boolean) => {
    Array.from(container.querySelectorAll<HTMLElement>('[data-scene]')).forEach((el, i) => {
      el.getBoundingClientRect = () => ({ top: zero ? 0 : (i - 2) * 300 + 100 }) as DOMRect
    })
  }
  it('a scroll while the screen is hidden does not change the saved position', () => {
    savePosition('demo', 'ب')
    const { container } = render(
      <ScreenActiveContext.Provider value={false}>
        <StoryBody content={content} fontClass="" />
      </ScreenActiveContext.Provider>,
    )
    place(container, true) // hidden screen: every rect is zero, so the last scene would win
    act(() => {
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(1000)
    })
    expect(readPosition('demo')).toBe('ب')
  })
  it('saving resumes when the screen becomes active again', () => {
    const tree = (active: boolean) => (
      <ScreenActiveContext.Provider value={active}>
        <StoryBody content={content} fontClass="" />
      </ScreenActiveContext.Provider>
    )
    const { container, rerender } = render(tree(false))
    rerender(tree(true))
    place(container, false)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(500)
    })
    expect(readPosition('demo')).toBe('ج')
  })
})

describe('accessibility of the scene index', () => {
  it('toggle controls the list, and focus returns to the toggle after choosing a scene', () => {
    render(<StoryBody content={content} fontClass="" />)
    const toggle = screen.getByText('فهرس المشاهد (5)')
    fireEvent.click(toggle)
    const list = document.getElementById(toggle.getAttribute('aria-controls')!)
    expect(list?.tagName).toBe('OL')
    fireEvent.click(screen.getByRole('button', { name: 'ج' }))
    expect(document.activeElement?.getAttribute('aria-controls')).toBe(toggle.getAttribute('aria-controls'))
  })
  it('"continue from" moves focus to the scene', () => {
    savePosition('demo', 'د')
    const { container } = render(<StoryBody content={content} fontClass="" />)
    fireEvent.click(screen.getByText('تابع من: د'))
    expect(document.activeElement).toBe(container.querySelector('[data-scene="د"]'))
  })
})

describe('backup round trip of the position key', () => {
  it('exports with the other keys and imports back; damaged shapes are rejected', () => {
    savePosition('demo', 'ج')
    localStorage.setItem('some_unrelated_key', 'x')
    const exported: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (isBackupKey(k)) exported[k] = localStorage.getItem(k)!
    }
    expect(Object.keys(exported)).toEqual([APP_SETTINGS_KEYS.prophetPosition])
    localStorage.clear()
    const { valid, rejected } = validateBackupEntries(JSON.parse(JSON.stringify(exported)), isBackupKey)
    expect(rejected).toEqual([])
    for (const [k, v] of valid) localStorage.setItem(k, v)
    expect(readPosition('demo')).toBe('ج')
    for (const bad of ['[1]', '{bad', '{"demo":5}', '{"demo":""}', '"x"']) {
      const r = validateBackupEntries({ [APP_SETTINGS_KEYS.prophetPosition]: bad }, isBackupKey)
      expect(r.rejected).toEqual([APP_SETTINGS_KEYS.prophetPosition])
    }
  })
})
