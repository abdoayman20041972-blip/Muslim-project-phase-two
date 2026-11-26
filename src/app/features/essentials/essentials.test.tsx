import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EssentialsChapter, EssentialsView } from './EssentialsView'
import { ESSENTIALS_CHAPTERS } from './essentialsData'
import { chapterProblems, isShippable, shippableChapters } from './essentialsGate'
import { SECTION_ORDER, type Chapter } from './essentialsTypes'

afterEach(cleanup)

const filler = 'نص للاختبار لاختبار شكل الواجهة فقط وليس مادة علمية ولا يُعرض للمستخدم'
/** Interface fixture. Not religious content: it only exercises layout and the gate. */
function fixture(over: Partial<Chapter> = {}): Chapter {
  const sections: Chapter['sections'] = {}
  for (const k of SECTION_ORDER) sections[k] = { paragraphs: [filler], items: k === 'steps' ? [filler, filler] : undefined }
  return {
    id: 'fx', title: 'فصل للاختبار', audience: 'universal', summary: 'ملخص للاختبار للقائمة', sections,
    sources: [{ title: 'مصدر للاختبار', rights: 'original' }],
    scholarReview: { reviewer: 'مراجع للاختبار', date: '2026-01-01' }, proofread: { by: 'مدقق للاختبار', date: '2026-01-01' },
    ...over,
  }
}

describe('essentials content gate', () => {
  it('ships no chapter today: the data file is empty until content is sourced and reviewed', () => {
    expect(ESSENTIALS_CHAPTERS.length).toBe(0)
    expect(shippableChapters(ESSENTIALS_CHAPTERS).length).toBe(0)
  })
  it('passes a complete reviewed chapter', () => {
    expect(chapterProblems(fixture())).toEqual([])
  })
  it('blocks unverified rights, missing review, missing proofreading and missing sources', () => {
    expect(chapterProblems(fixture({ sources: [{ title: 'x', rights: 'unverified' }] }))).toContain('rights-unverified')
    expect(chapterProblems(fixture({ scholarReview: undefined }))).toContain('no-scholar-review')
    expect(chapterProblems(fixture({ proofread: undefined }))).toContain('not-proofread')
    expect(chapterProblems(fixture({ sources: [] }))).toContain('no-sources')
  })
  it('requires the explanation, allows other parts to be absent, rejects thin parts, never accepts a bare no-khilaf claim', () => {
    const f = fixture(); delete f.sections.examples; delete f.sections.khilaf
    expect(chapterProblems(f)).toEqual([])
    const g = fixture(); delete g.sections.explanation
    expect(chapterProblems(g)).toContain('section-missing:explanation')
    const h = fixture(); h.sections.khilaf = { paragraphs: ['قصير'] }
    expect(chapterProblems(h)).toContain('section-thin:khilaf')
  })
  it('shows a custom section label when given, otherwise the default', () => {
    const c = fixture(); c.sections.examples = { ...c.sections.examples!, label: 'من يباح له الفطر' }
    render(<EssentialsChapter chapter={c} onBack={() => {}} />)
    expect(screen.getByTestId('ess-section-examples').textContent).toContain('من يباح له الفطر')
    expect(screen.getByTestId('ess-section-idea').textContent).toContain('الفكرة في دقيقة')
  })
  it('lets a personal pack be unreviewed but the built-in gate never does', () => {
    const c = fixture({ scholarReview: undefined, proofread: undefined })
    expect(chapterProblems(c, { allowUnreviewed: true })).toEqual([])
    expect(chapterProblems(c)).toContain('no-scholar-review')
  })
  it('lints placeholders, double spaces, tatweel, Latin leftovers and AI wording', () => {
    const bad = (t: string) => { const c = fixture(); c.sections.idea = { paragraphs: [t + ' ' + filler] }; return chapterProblems(c).some((p) => p.startsWith('text-lint')) }
    expect(bad('TODO')).toBe(true)
    expect(bad('كلمـة')).toBe(true)
    expect(bad('كلمة  مكررة')).toBe(true)
    expect(bad('this is english')).toBe(true)
    expect(bad('كتبه ذكاء اصطناعي')).toBe(true)
  })
})

describe('EssentialsView', () => {
  it('lists only chapters that pass the gate, grouped by audience, and opens a chapter with all eight parts in order', () => {
    const blocked = fixture({ id: 'bad', title: 'فصل محجوب', sources: [{ title: 'x', rights: 'unverified' }] })
    const sit = fixture({ id: 'sit', title: 'فصل حسب الحال', audience: 'situational' })
    render(<EssentialsView onBack={() => {}} chapters={[fixture(), blocked, sit]} />)
    expect(screen.queryByText('فصل محجوب')).toBeNull()
    expect(screen.getByText('يلزم كل مسلم')).toBeTruthy()
    expect(screen.getByText('حسب حالك')).toBeTruthy()
    fireEvent.click(screen.getByTestId('essentials-card-fx'))
    const ids = SECTION_ORDER.map((k) => screen.getByTestId(`ess-section-${k}`))
    expect(ids.length).toBe(8)
    for (let i = 1; i < ids.length; i++) expect(ids[i - 1].compareDocumentPosition(ids[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByTestId('ess-sources').textContent).toContain('مصدر للاختبار')
  })
  it('shows an empty screen with no cards when nothing passes', () => {
    const { container } = render(<EssentialsView onBack={() => {}} chapters={[]} />)
    expect(container.querySelectorAll('[data-testid^="essentials-card-"]').length).toBe(0)
  })
})
