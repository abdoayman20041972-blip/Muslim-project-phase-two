import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeerahView } from './SeerahView'
import { SEERAH_CHAPTERS } from './seerahData'

describe('SeerahView', () => {
  it('lists every chapter, opens one at a time and shows lesson and source', () => {
    render(<SeerahView onBack={() => {}} />)
    expect(screen.getAllByTestId('seerah-chapter')).toHaveLength(SEERAH_CHAPTERS.length)
    expect(screen.getByText('خلاصة للتأمل')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /الهجرة إلى المدينة/ }))
    expect(screen.getAllByText('خلاصة للتأمل')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /سورة التوبة/ }).getAttribute('href')).toBe('https://quran.com/9/40')
  })
  it('keeps every source link https and every chapter lesson non-empty', () => {
    for (const c of SEERAH_CHAPTERS) {
      expect(c.lesson.length).toBeGreaterThan(10)
      expect(c.sources.length).toBeGreaterThan(0)
      for (const s of c.sources) if (s.url) expect(s.url.startsWith('https://')).toBe(true)
    }
  })
})
