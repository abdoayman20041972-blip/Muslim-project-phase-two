import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SurahInfoCard } from './SurahInfoCard'
import { resetQuranCenterCaches } from './quranCenterData'
import type { SurahMeta } from '../../../../quran-meta'

const surah: SurahMeta = { number: 18, name: 'سُورَةُ الكَهۡفِ', shortName: 'الكهف', numberOfAyahs: 110, revelationType: 'Meccan' }

const rows = Array.from({ length: 114 }, (_, i) => ({
  surah: i + 1,
  type: i % 2 ? 'مدنية' : 'مكية',
  descentOrder: i + 1,
  wordsCount: 100 + i,
  introduction: 'نبذة عن السورة',
  grace: '',
}))
rows[17] = { ...rows[17], type: 'مكية', descentOrder: 69, wordsCount: 1583, introduction: 'نبذة الكهف', grace: 'خبر فضل الكهف' }

beforeEach(() => { resetQuranCenterCaches(); vi.unstubAllGlobals() })

function stubFetch(ok: unknown, statuses?: unknown) {
  const review = statuses === undefined ? { scopes: { metadata: { status: 'verified' }, virtues: { status: 'verified' } } } : statuses
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('review-status.json')) {
      return review === null ? { ok: false, status: 404, json: async () => null } : { ok: true, status: 200, json: async () => review }
    }
    if (String(url).includes('surahs-info.json')) {
      return ok === null ? { ok: false, status: 404, json: async () => null } : { ok: true, status: 200, json: async () => ok }
    }
    if (String(url).includes('version.json')) return { ok: true, status: 200, json: async () => ({ dumpVersion: '2026-11-24' }) }
    return { ok: false, status: 404, json: async () => null }
  }))
}

describe('SurahInfoCard', () => {
  it('shows the surah facts, brief and source', async () => {
    stubFetch(rows)
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('نبذة الكهف')).toBeTruthy())
    expect(screen.getByText('مكية')).toBeTruthy()
    expect(screen.getByText('٦٩')).toBeTruthy() // descent order
    expect(screen.getByText('١١٠')).toBeTruthy() // ayah count from local meta
    expect(screen.getByText(/الموسوعة القرآنية/)).toBeTruthy()
    expect(screen.getByText(/٢٠٢٦-١١-٢٤|2026-11-24/)).toBeTruthy()
  })

  it('marks virtue reports as needing scholarly review', async () => {
    stubFetch(rows)
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('خبر فضل الكهف')).toBeTruthy())
    expect(screen.getByRole('note').textContent).toContain('تخريجٍ ومراجعةٍ علمية')
  })

  it('fails visibly when the dataset is unavailable', async () => {
    stubFetch(null)
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('تعذر تحميل معلومات السورة.')).toBeTruthy())
  })

  it('locks surah metadata behind the review gate while pending and never fetches the metadata file', async () => {
    stubFetch(rows, { scopes: { metadata: { status: 'pending-review' }, virtues: { status: 'pending-review' } } })
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('note').textContent).toContain('موقوفة مؤقتًا لحين اعتماد المراجعة العلمية'))
    expect(screen.queryByText('نبذة الكهف')).toBeNull()
    expect(screen.queryByText('خبر فضل الكهف')).toBeNull()
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('surahs-info.json'))).toBe(false)
  })

  it('fails closed: a missing review-status file locks metadata and virtues without fetching them', async () => {
    stubFetch(rows, null)
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('note').textContent).toContain('موقوفة مؤقتًا'))
    expect(screen.queryByText('نبذة الكهف')).toBeNull()
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('surahs-info.json'))).toBe(false)
  })

  it('hides virtue reports while the virtues scope is pending, even when metadata is verified', async () => {
    stubFetch(rows, { scopes: { metadata: { status: 'verified' }, virtues: { status: 'pending-review' } } })
    render(<SurahInfoCard surah={surah} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('نبذة الكهف')).toBeTruthy())
    expect(screen.queryByText('خبر فضل الكهف')).toBeNull()
  })
})
