import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('../../src/app/features/azkar/shareCard', () => ({
  renderShareCard: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/png' })),
  shareImageBlob: vi.fn(),
}))

import { shareQuoteCard } from '../../src/app/features/azkar/shareActions'
import { shareImageBlob } from '../../src/app/features/azkar/shareCard'

describe('shareQuoteCard on the app', () => {
  afterEach(() => { document.body.innerHTML = '' })
  it('shows a notice, not a text share, when the native card share genuinely fails', async () => {
    vi.mocked(shareImageBlob).mockResolvedValue(false)
    expect(await shareQuoteCard({ text: 'a', heading: 'h', filename: 'f.png' })).toBe(false)
    expect(document.querySelector('[role=status]')?.textContent).toContain('تعذّرت المشاركة')
  })
  it('shows no notice when sharing succeeds or the sheet is cancelled', async () => {
    vi.mocked(shareImageBlob).mockResolvedValue(true)
    expect(await shareQuoteCard({ text: 'a', heading: 'h', filename: 'f.png' })).toBe(true)
    expect(document.querySelector('[role=status]')).toBeNull()
  })
})
