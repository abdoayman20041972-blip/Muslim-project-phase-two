import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AyahCenterCard } from './AyahCenterCard'
import { resetQuranCenterCaches } from './quranCenterData'
import type { SurahMeta } from '../../../../quran-meta'

vi.mock('../QuranAudioProvider', () => ({
  useQuranAudio: () => ({
    startMemorize: vi.fn(),
    memorize: null,
    stop: vi.fn(),
    toggleCurrent: vi.fn(),
    playing: false,
  }),
}))

const surah: SurahMeta = { number: 2, name: 'سُورَةُ البَقَرَةِ', shortName: 'البقرة', numberOfAyahs: 286, revelationType: 'Medinan' }
const ayah = { number: 8, numberInSurah: 1, text: 'الم' }
const ayahs = [
  ayah,
  { number: 9, numberInSurah: 2, text: 'ذلك الكتاب لا ريب فيه' },
  { number: 10, numberInSurah: 3, text: 'الذين يؤمنون بالغيب' },
]

const gharibData = {
  '1': [{
    book: 'تذكرة الأريب في تفسير الغريب', author: 'ابن الجوزي (ت ٥٩٧هـ)',
    words: [{ text: 'الم', meaning: 'من حروف الهجاء في أوائل السور' }],
  }],
}
const asbabData = { '1': [{ text: 'نص سبب النزول كما روي', source: 'صحيح البخاري', reference: 'صحيح البخاري 4592', grade: 'صحيح' }] }

function stubFetch(routes: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => String(url).includes(k))
    if (!key) return { ok: false, status: 404, json: async () => null }
    return { ok: true, status: 200, json: async () => routes[key] }
  }))
}

const tafsirReady = {
  text: 'نص التفسير الميسر للآية', loading: false, error: false, label: 'التفسير الميسر', forThisAyah: true,
}

function renderCard(overrides: Partial<Parameters<typeof AyahCenterCard>[0]> = {}) {
  const onClose = vi.fn()
  const onTafsirTab = vi.fn()
  render(
    <AyahCenterCard
      surah={surah}
      ayah={ayah}
      ayahs={ayahs}
      reciter="ar.minshawi"
      tafsir={tafsirReady}
      onTafsirTab={onTafsirTab}
      onClose={onClose}
      hideText={false}
      onHideTextChange={vi.fn()}
      {...overrides}
    />,
  )
  return { onClose, onTafsirTab }
}

beforeEach(() => { resetQuranCenterCaches(); vi.unstubAllGlobals() })

describe('AyahCenterCard', () => {
  it('opens on the tafsir tab with the four sections available', () => {
    renderCard()
    expect(screen.getByRole('dialog', { name: /بطاقة الآية/ })).toBeTruthy()
    for (const label of ['التفسير', 'معاني الكلمات', 'سبب النزول', 'الحفظ بالتكرار']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy()
    }
    expect(screen.getByText('نص التفسير الميسر للآية')).toBeTruthy()
  })

  it('shows the word meanings with their book attribution', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { gharib: { status: 'verified' } } }, '/data/quran-center/gharib/2.json': gharibData })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'معاني الكلمات' }))
    await waitFor(() => expect(screen.getByText('من حروف الهجاء في أوائل السور')).toBeTruthy())
    expect(screen.getByText(/تذكرة الأريب في تفسير الغريب/)).toBeTruthy()
    expect(screen.getByText('الم')).toBeTruthy()
  })

  it('explains honestly when an ayah has no explained words', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { gharib: { status: 'verified' } } }, '/data/quran-center/gharib/2.json': {} })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'معاني الكلمات' }))
    await waitFor(() => expect(screen.getByText(/لا توجد ألفاظ مشروحة لهذه الآية/)).toBeTruthy())
  })

  it('locks word meanings behind the review gate and never fetches gharib data while pending', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { gharib: { status: 'pending-reverification' } } } })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'معاني الكلمات' }))
    await waitFor(() => expect(screen.getByRole('note').textContent).toContain('موقوفة مؤقتًا للمراجعة العلمية'))
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/gharib/'))).toBe(false)
  })

  it('fails closed: a missing review-status file keeps word meanings locked', async () => {
    stubFetch({ '/data/quran-center/gharib/2.json': gharibData })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'معاني الكلمات' }))
    await waitFor(() => expect(screen.getByRole('note').textContent).toContain('موقوفة مؤقتًا للمراجعة العلمية'))
    expect(screen.queryByText('من حروف الهجاء في أوائل السور')).toBeNull()
  })

  it('shows the verified narration with its grade and reference', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { asbab: { status: 'verified' } } }, '/data/quran-center/asbab/2.json': asbabData })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'سبب النزول' }))
    await waitFor(() => expect(screen.getByText('نص سبب النزول كما روي')).toBeTruthy())
    expect(screen.getByText('صحيح البخاري 4592')).toBeTruthy()
    expect(screen.getByText('صحيح')).toBeTruthy()
    const note = screen.getByRole('note').textContent
    expect(note).toContain('سبب النزول بحسب المرجع المذكور')
    expect(note).toContain('التغطية تقتصر على الروايات المراجعة في هذه النسخة')
  })

  it('labels a non-causal related narration neutrally instead of as the proven cause', async () => {
    const related = { '1': [{ text: 'نص رواية متعلقة بالآية', source: 'صحيح مسلم', reference: 'صحيح مسلم 119a', grade: 'صحيح', relation: 'متعلقة' }] }
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { asbab: { status: 'verified' } } }, '/data/quran-center/asbab/2.json': related })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'سبب النزول' }))
    await waitFor(() => expect(screen.getByText('نص رواية متعلقة بالآية')).toBeTruthy())
    expect(screen.getByText('رواية متعلقة بنزول الآية')).toBeTruthy()
  })

  it('says plainly when no cause is narrated for the ayah', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { asbab: { status: 'verified' } } }, '/data/quran-center/asbab/2.json': {} })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'سبب النزول' }))
    await waitFor(() => expect(screen.getByText(/لا تتوفر روايةُ سببِ نزولٍ مدققة لهذه الآية/)).toBeTruthy())
  })

  it('locks narrated causes behind the review gate even when data is present, without fetching them', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { asbab: { status: 'pending-review' } } }, '/data/quran-center/asbab/2.json': asbabData })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'سبب النزول' }))
    await waitFor(() => expect(screen.getByText(/لا تتوفر روايةُ سببِ نزولٍ مدققة لهذه الآية في النسخة الحالية/)).toBeTruthy())
    expect(screen.queryByText('نص سبب النزول كما روي')).toBeNull()
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/asbab/'))).toBe(false)
  })

  it('uses the same honest current-version wording when a surah ships no narrations', async () => {
    stubFetch({ '/data/quran-center/review-status.json': { scopes: { asbab: { status: 'verified' } } } })
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'سبب النزول' }))
    await waitFor(() => expect(screen.getByText(/لا تتوفر روايةُ سببِ نزولٍ مدققة لهذه الآية في النسخة الحالية/)).toBeTruthy())
    expect(screen.queryByText(/ستُتاح|قيد المراجعة العلمية/)).toBeNull()
  })

  it('loads the tafsir lazily when its tab becomes active', () => {
    const { onTafsirTab } = renderCard({ tafsir: { ...tafsirReady, forThisAyah: false, text: null, loading: true } })
    expect(onTafsirTab).toHaveBeenCalled()
  })

  it('closes from the close button', () => {
    const { onClose } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق بطاقة الآية' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('offers the memorization form on its tab', () => {
    renderCard()
    fireEvent.click(screen.getByRole('tab', { name: 'الحفظ بالتكرار' }))
    expect(screen.getByTestId('memorize-form')).toBeTruthy()
    expect(screen.getByLabelText('إلى الآية')).toBeTruthy()
    expect(screen.getByLabelText('إخفاء نص الآية أثناء التكرار')).toBeTruthy()
  })
})
