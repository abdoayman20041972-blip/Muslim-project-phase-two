import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HadithView } from './HadithView'
import { HADITH_COLLECTION } from './hadithData'

describe('HadithView curated tab', () => {
  it('marks partial quotations with an excerpt badge and leaves full narrations unmarked', () => {
    render(<HadithView onBack={vi.fn()} />)
    const flagged = HADITH_COLLECTION.filter((entry) => entry.excerpt).length
    expect(flagged).toBeGreaterThan(0)
    expect(screen.getAllByTestId('hadith-excerpt-badge')).toHaveLength(flagged)
    expect(document.querySelectorAll('.hadith-card')).toHaveLength(HADITH_COLLECTION.length)
  })
})
