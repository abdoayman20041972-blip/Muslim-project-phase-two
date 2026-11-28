import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoryBody } from './StoryBody'
import { PROPHET_STORIES } from './prophetsData'
import { DETAILED_STORIES } from './storyContent'
import { YUSUF_SCENES } from './yusufStory'
import type { StoryContent } from './storyTypes'

afterEach(cleanup)

const story = (v?: true): StoryContent => ({
  id: 'x',
  scenes: [{ h: 'مشهد', p: [{ k: 't', w: 'ابن كثير', t: 'نص التفسير', ...(v ? { v } : {}) }], v: [] }],
})

describe('tafsir card label', () => {
  it('shows "ملخص المعنى" without naming Ibn Kathir when the card is not marked verified', () => {
    render(<StoryBody content={story()} fontClass="" />)
    expect(screen.getByText('ملخص المعنى')).toBeTruthy()
    expect(screen.queryByText('من تفسير ابن كثير')).toBeNull()
  })
  it('names the source only for a card flagged verified', () => {
    render(<StoryBody content={story(true)} fontClass="" />)
    expect(screen.getByText('من تفسير ابن كثير')).toBeTruthy()
  })
  it('keeps the narrator but drops the Ibn Kathir name on unverified named-narrator cards', () => {
    const c: StoryContent = { id: 'x', scenes: [{ h: 'مشهد', p: [{ k: 't', w: 'مجاهد', t: 'نص' }], v: [] }] }
    render(<StoryBody content={c} fontClass="" />)
    expect(screen.getByText('ملخص المعنى، عن مجاهد')).toBeTruthy()
    expect(document.body.textContent).not.toContain('ابن كثير')
  })
  it('has no card marked verified yet (no reference was checked against a source copy)', () => {
    const all = [...Object.values(DETAILED_STORIES).flatMap((c) => c.scenes), ...YUSUF_SCENES].flatMap((s) => s.p)
    expect(all.filter((p) => p.k === 't' && p.v).length).toBe(0)
  })
})

describe('removed duplicates and the Harun card verse', () => {
  const texts = JSON.stringify([DETAILED_STORIES.salih, YUSUF_SCENES])
  it('no longer carries the three duplicate tafsir cards', () => {
    expect(texts).not.toContain('أي: احذروا ناقة الله أن تمسوها')
    expect(texts).not.toContain('أوحى الله إلى يوسف في ذلك الحال')
    expect(texts).not.toContain('الصبر الجميل: الذي لا جزع فيه')
    expect(texts).toContain('هو الصبر الذي لا جزع فيه')
  })
  it('uses 19:53 (about Harun, already in his story) as his card verse', () => {
    const h = PROPHET_STORIES.find((s) => s.id === 'harun')!
    expect(h.verse.ref).toBe('مريم: ٥٣')
    expect(DETAILED_STORIES.harun.intro!.v).toContainEqual([19, 53, 53])
  })
})
