import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_KEYS, SETTINGS_RESET_KEYS, APP_SETTINGS_KEYS } from '../../settings'
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
