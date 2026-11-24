import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HadithSection, ProphetsSection, HADITH_NOTE_KEY, PROPHET_QUESTION_KEY } from '../../src/app/features/settings/sections/HadithProphetsSection'

describe('reading note toggles offer both states', () => {
  beforeEach(() => localStorage.clear())
  it('hadith: shown by default, can be hidden and shown again', () => {
    render(<HadithSection />)
    expect(screen.getByRole('button', { name: 'ظاهرة' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'مخفية' }))
    expect(localStorage.getItem(HADITH_NOTE_KEY)).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'ظاهرة' }))
    expect(localStorage.getItem(HADITH_NOTE_KEY)).toBe('1')
  })
  it('prophets: control is labelled for the reflection question', () => {
    render(<ProphetsSection />)
    expect(screen.getByText('التأمل بعد القصة')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'مخفية' }))
    expect(localStorage.getItem(PROPHET_QUESTION_KEY)).toBe('0')
  })
})
