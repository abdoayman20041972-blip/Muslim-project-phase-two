import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EssentialsChapter, EssentialsView } from './EssentialsView'
import { chapterWords, groupChapters, readMinutes, readingUnits } from './essentialsReading'
import { SECTION_ORDER, type Chapter } from './essentialsTypes'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

const TITLES: Record<string, string> = { a: 'ألف', b: 'باء' }
const sentence = 'هذه جملة طويلة نسبيا للاختبار فقط وليست مادة علمية ولا تعرض للمستخدم أبدا في أي مكان.'
function fx(id: string, over: Partial<Chapter> = {}): Chapter {
  const sections: Chapter['sections'] = {}
  for (const k of SECTION_ORDER) sections[k] = { paragraphs: [sentence], items: k === 'steps' ? ['خطوة أولى', 'خطوة ثانية'] : undefined }
  return {
    id, title: 'فصل ' + (TITLES[id] ?? id), audience: 'universal', summary: 'ملخص ' + (TITLES[id] ?? id), sections,
    sources: [{ title: 'مصدر للاختبار', rights: 'original' }],
    scholarReview: { reviewer: 'مراجع للاختبار', date: '2026-01-01' }, proofread: { by: 'مدقق للاختبار', date: '2026-01-01' },
    ...over,
  }
}

describe('reading helpers', () => {
  it('keeps a verse or a quoted saying whole and splits long plain text into short units', () => {
    expect(readingUnits('قال تعالى: ﴿كلمة﴾')).toEqual([{ kind: 'ayah', text: 'قال تعالى: ﴿كلمة﴾' }])
    expect(readingUnits('قال ﷺ: «نص»')[0].kind).toBe('quote')
    const longQ = 'قال ﷺ: «نص» ' + sentence.repeat(12)
    expect(readingUnits(longQ)).toEqual([{ kind: 'text', text: longQ }])
    const units = readingUnits(Array(10).fill(sentence).join(' '))
    expect(units.length).toBeGreaterThan(2)
    expect(units.every((u) => u.kind === 'text' && u.text.split('.').filter(Boolean).length <= 2)).toBe(true)
    expect(readingUnits('جملة قصيرة.')).toEqual([{ kind: 'text', text: 'جملة قصيرة.' }])
  })
  it('counts words and never reports below one minute', () => {
    const c = fx('a')
    expect(chapterWords(c)).toBeGreaterThan(10)
    expect(readMinutes(c)).toBe(1)
  })
  it('groups by topic in order of appearance, else by audience', () => {
    const g = groupChapters([fx('a', { topic: 'ب' }), fx('b', { topic: 'أ' }), fx('c', { topic: 'ب' })], [])
    expect(g.map((x) => [x.label, x.chapters.length])).toEqual([['ب', 2], ['أ', 1]])
    const h = groupChapters([fx('a'), fx('b', { audience: 'situational' })], [{ id: 'universal', label: 'U', hint: '' }, { id: 'situational', label: 'S', hint: '' }])
    expect(h.map((x) => x.label)).toEqual(['U', 'S'])
  })
})

describe('reader', () => {
  it('searches, groups by topic, marks read, resumes, and moves between chapters', () => {
    render(<EssentialsView onBack={() => {}} chapters={[fx('a', { topic: 'الطهارة' }), fx('b', { topic: 'الصلاة' })]} />)
    expect(screen.getByTestId('essentials-group-الطهارة')).toBeTruthy()
    fireEvent.change(screen.getByTestId('essentials-search'), { target: { value: 'باء' } })
    expect(screen.queryByTestId('essentials-card-a')).toBeNull()
    fireEvent.change(screen.getByTestId('essentials-search'), { target: { value: 'zzz' } })
    expect(screen.getByTestId('essentials-no-match')).toBeTruthy()
    fireEvent.change(screen.getByTestId('essentials-search'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('essentials-card-a'))
    expect(screen.getByTestId('ess-position').textContent).toContain('1 من 2')
    expect(screen.getByTestId('ess-lead').textContent).toBe('ملخص ألف')
    fireEvent.click(screen.getByTestId('ess-done'))
    expect(JSON.parse(localStorage.getItem('essentials-read-v1')!)).toEqual(['a'])
    fireEvent.click(screen.getByTestId('ess-next'))
    expect(screen.getByTestId('ess-position').textContent).toContain('2 من 2')
    expect(localStorage.getItem('essentials-last-v1')).toBe('b')
    fireEvent.click(screen.getByTestId('ess-font-up'))
    expect(localStorage.getItem('essentials-font-v1')).toBe('2')
  })
  it('shows no notes block when there are none, no preliminary wording, and a neutral unreviewed note only without a review', () => {
    const { container } = render(<EssentialsChapter onBack={() => {}} chapter={fx('a', { scholarReview: undefined })} />)
    expect(screen.queryByTestId('ess-held')).toBeNull()
    expect(screen.getByTestId('ess-unreviewed').textContent).toBe('لم يراجعه عالم بعد.')
    expect(container.textContent).not.toMatch(/تجريب|أولي/)
  })
  it('shows sunnah items as an unnumbered note and restores qualifications in a notes block', () => {
    const c = fx('a', { held: ['هذا تنبيه عملي للاختبار.'] })
    c.sections.steps = { paragraphs: ['فروض للاختبار:'], items: ['الأول', 'الثاني', 'سنن الوضوء كما في الكتاب: التسمية'] }
    render(<EssentialsChapter onBack={() => {}} chapter={c} />)
    const nums = document.querySelectorAll('.ess-step-n')
    expect(nums.length).toBe(2)
    expect(screen.getAllByTestId('ess-step-note').length).toBe(1)
    expect(screen.getByTestId('ess-held').textContent).toContain('تنبيه عملي')
    expect(screen.getByTestId('ess-held').textContent).not.toMatch(/تجريب|أولي/)
  })
})
