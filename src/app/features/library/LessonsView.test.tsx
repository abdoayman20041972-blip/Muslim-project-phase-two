import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LessonsView } from './LessonsView'
import { LESSON_EPISODES } from './lessonsData'

afterEach(cleanup)

describe('LessonsView', () => {
  it('lists all episodes as external YouTube links that do not leak the opener', () => {
    render(<LessonsView onBack={() => {}} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(LESSON_EPISODES.length)
    expect(LESSON_EPISODES).toHaveLength(24)
    for (const a of links) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/)
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toContain('noopener')
    }
  })
})
