import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EssentialsView, chaptersWord } from './EssentialsView'
import { PACK_KEY, loadPack, parsePack, savePack } from './essentialsPack'
import { SECTION_ORDER, type Chapter } from './essentialsTypes'

const filler = 'نص تجريبي لاختبار شكل الواجهة فقط وليس مادة علمية ولا يُعرض للمستخدم'
function chapter(id: string, over: Partial<Chapter> = {}): Chapter {
  const sections: Chapter['sections'] = {}
  for (const k of SECTION_ORDER) sections[k] = { paragraphs: [filler] }
  return { id, title: 'فصل ' + id, audience: 'universal', summary: 'ملخص تجريبي', sections, sources: [{ title: 'كتاب شخصي', rights: 'unverified' }], scholarReview: { reviewer: 'مراجع', date: '2026-01-01' }, proofread: { by: 'مدقق', date: '2026-01-01' }, ...over }
}
const pack = (chapters: unknown[]) => JSON.stringify({ version: 1, chapters })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('essentials personal pack', () => {
  it('accepts unverified-rights sources in a personal pack and unreviewed chapters but still rejects incomplete ones', () => {
    const noReview = chapter('b', { sections: {} })
    const r = parsePack(pack([chapter('a'), noReview]))
    expect(r.chapters.map((c) => c.id)).toEqual(['a'])
    expect(r.rejected).toEqual([{ id: 'b', problems: ['section-missing:explanation'] }])
  })
  it('rejects bad JSON, wrong format, bad shape, duplicate ids and oversized files', () => {
    expect(parsePack('{oops').error).toBe('invalid-json')
    expect(parsePack('{"version":2,"chapters":[]}').error).toBe('wrong-format')
    expect(parsePack(pack([{ id: 'X Y' }])).rejected[0].problems).toEqual(['bad-shape'])
    expect(parsePack(pack([chapter('a'), chapter('a')])).rejected[0].problems).toEqual(['duplicate-id'])
    expect(parsePack('x'.repeat(3_000_001)).error).toBe('too-large')
  })
  it('saves and loads only a valid pack, and never stores a rejected one', () => {
    expect(savePack(pack([chapter('a', { sections: {} })]))).toBe(false)
    expect(localStorage.getItem(PACK_KEY)).toBeNull()
    expect(savePack(pack([chapter('a')]))).toBe(true)
    expect(loadPack().map((c) => c.id)).toEqual(['a'])
  })
  it('imports a file through the screen, lists the chapter, and deletes the pack', async () => {
    render(<EssentialsView onBack={() => {}} chapters={[]} />)
    expect(screen.getByTestId('essentials-empty')).toBeTruthy()
    const file = new File([pack([chapter('a'), chapter('b', { sections: {} })])], 'pack.json', { type: 'application/json' })
    fireEvent.change(screen.getByTestId('essentials-file'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByTestId('essentials-message').textContent).toContain('تم استيراد فصل واحد'))
    expect(screen.getByTestId('essentials-message').textContent).toContain('رُفض 1')
    expect(screen.getByTestId('essentials-card-a')).toBeTruthy()
    fireEvent.click(screen.getByTestId('essentials-clear'))
    expect(screen.queryByTestId('essentials-card-a')).toBeNull()
    expect(localStorage.getItem(PACK_KEY)).toBeNull()
  })
  it('names the real rejection reasons when nothing is accepted', async () => {
    render(<EssentialsView onBack={() => {}} chapters={[]} />)
    const file = new File([pack([chapter('bad', { sections: {} })])], 'p.json', { type: 'application/json' })
    fireEvent.change(screen.getByTestId('essentials-file'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByTestId('essentials-message').textContent).toContain('قسم الشرح ناقص'))
  })
  it('refuses an oversized file by its size before reading it, and measures bytes not characters', async () => {
    const big = new File(['x'], 'big.json'); Object.defineProperty(big, 'size', { value: 3_000_001 })
    render(<EssentialsView onBack={() => {}} chapters={[]} />)
    fireEvent.change(screen.getByTestId('essentials-file'), { target: { files: [big] } })
    await waitFor(() => expect(screen.getByTestId('essentials-message').textContent).toContain('أكبر من الحد'))
    expect(parsePack('ع'.repeat(1_600_000)).error).toBe('too-large')
  })
  it('rejects badly shaped review and proofread entries', () => {
    expect(parsePack(pack([chapter('a', { scholarReview: 'x' as never })])).rejected[0].problems).toEqual(['bad-shape'])
    expect(parsePack(pack([chapter('b', { proofread: { by: 1 } as never })])).rejected[0].problems).toEqual(['bad-shape'])
  })
  it('words chapter counts in Arabic', () => {
    expect([1, 2, 5, 12].map(chaptersWord)).toEqual(['فصل واحد', 'فصلان', '5 فصول', '12 فصلًا'])
  })
  it('reports an invalid file without changing what is stored', async () => {
    savePack(pack([chapter('a')]))
    render(<EssentialsView onBack={() => {}} chapters={[]} />)
    fireEvent.change(screen.getByTestId('essentials-file'), { target: { files: [new File(['nope'], 'x.json')] } })
    await waitFor(() => expect(screen.getByTestId('essentials-message').textContent).toContain('ليس حزمة'))
    expect(loadPack().length).toBe(1)
  })
})

describe('rejection reasons in Arabic and private preinstall', () => {
  it('labels every gate code in Arabic and isolates the chapter id', async () => {
    const { problemLabel, rejectedLine } = await import('./essentialsPack')
    expect(problemLabel('section-missing:explanation')).toBe('قسم الشرح ناقص')
    expect(problemLabel('section-thin:idea')).toContain('الفكرة في دقيقة')
    for (const code of ['no-sources', 'rights-unverified', 'no-scholar-review', 'not-proofread', 'text-lint:x', 'bad-shape', 'duplicate-id', 'whatever']) expect(problemLabel(code)).toMatch(/^[\u0600-\u06FF ]+$/)
    const line = rejectedLine({ id: 'abc', problems: ['no-sources', 'bad-shape'] })
    expect(line).toBe('\u2068abc\u2069: بلا مصادر، شكل الفصل غير صحيح')
  })
  it('shows Arabic reasons in the import message', async () => {
    render(<EssentialsView onBack={() => {}} />)
    const bad = pack([chapter('b', { sections: {} })])
    const input = screen.getByTestId('essentials-file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([bad], 'p.json', { type: 'application/json' })] } })
    await waitFor(() => expect(screen.getByTestId('essentials-message').textContent).toContain('قسم الشرح ناقص'))
    expect(screen.getByTestId('essentials-message').textContent).not.toContain('section-missing')
    expect(screen.getByTestId('essentials-message').getAttribute('dir')).toBe('rtl')
  })
  it('preinstalls once, never over an existing or cleared pack, and ignores bad input', async () => {
    const { installPreinstalledPack, PREINSTALL_FLAG } = await import('./essentialsPreinstall')
    const raw = pack([chapter('a')])
    expect(installPreinstalledPack(undefined)).toBe(false)
    expect(installPreinstalledPack('{oops')).toBe(false)
    expect(installPreinstalledPack(raw)).toBe(true)
    expect(loadPack().map((c) => c.id)).toEqual(['a'])
    localStorage.removeItem(PACK_KEY)
    expect(installPreinstalledPack(raw)).toBe(false)
    expect(localStorage.getItem(PREINSTALL_FLAG)).toBe('1')
    expect(loadPack()).toEqual([])
    localStorage.clear()
    localStorage.setItem(PACK_KEY, pack([chapter('m1')]))
    expect(installPreinstalledPack(raw)).toBe(false)
    expect(loadPack().map((c) => c.id)).toEqual(['m1'])
  })
})
