import type { Chapter } from './essentialsTypes'

/** Words in the reading text of a chapter (paragraphs and list items). */
export function chapterWords(c: Chapter): number {
  let n = 0
  for (const b of Object.values(c.sections)) for (const t of [...(b?.paragraphs ?? []), ...(b?.items ?? [])]) n += t.split(/\s+/).filter(Boolean).length
  return n
}
/** Whole minutes to read, at about 150 words a minute, never below one. */
export function readMinutes(c: Chapter): number { return Math.max(1, Math.ceil(chapterWords(c) / 150)) }

export type Unit = { kind: 'ayah' | 'quote' | 'text'; text: string }
const LONG = 200
const QUOTE_MAX = 300
/**
 * Splits one paragraph into short reading units. A short paragraph holding a verse or a quoted saying becomes a quote block; a long one stays whole as plain text so a quotation is never cut.
 * Other long paragraphs are cut after full stops into groups of at most two sentences.
 */
export function readingUnits(p: string): Unit[] {
  const quoted = p.includes('﴿') || p.includes('«')
  if (quoted && p.length > QUOTE_MAX) return [{ kind: 'text', text: p }]
  if (p.includes('﴿')) return [{ kind: 'ayah', text: p }]
  if (p.includes('«')) return [{ kind: 'quote', text: p }]
  if (p.length <= LONG) return [{ kind: 'text', text: p }]
  const sentences = p.split(/(?<=\.)\s+/).filter(Boolean)
  const out: string[] = []
  let cur = ''
  let count = 0
  for (const s of sentences) {
    if (cur && (count >= 2 || (cur + ' ' + s).length > LONG * 1.6)) { out.push(cur); cur = ''; count = 0 }
    cur = cur ? cur + ' ' + s : s
    count++
  }
  if (cur) out.push(cur)
  return out.map((text) => ({ kind: 'text' as const, text }))
}

export const FONT_LEVELS = [0.94, 1, 1.1, 1.22] as const
const FONT_KEY = 'essentials-font-v1'
const READ_KEY = 'essentials-read-v1'
const LAST_KEY = 'essentials-last-v1'

type S = Pick<Storage, 'getItem' | 'setItem'>
const store = (): S | null => { try { return localStorage } catch { return null } }

export function loadFontLevel(s: S | null = store()): number {
  try { const raw = s?.getItem(FONT_KEY); if (raw == null) return 1; const v = Number(raw); return Number.isInteger(v) && v >= 0 && v < FONT_LEVELS.length ? v : 1 } catch { return 1 }
}
export function saveFontLevel(v: number, s: S | null = store()) { try { s?.setItem(FONT_KEY, String(v)) } catch { /* ignore */ } }
export function loadRead(s: S | null = store()): string[] {
  try { const v = JSON.parse(s?.getItem(READ_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [] } catch { return [] }
}
export function saveRead(ids: string[], s: S | null = store()) { try { s?.setItem(READ_KEY, JSON.stringify(ids)) } catch { /* ignore */ } }
export function loadLast(s: S | null = store()): string | null { try { return s?.getItem(LAST_KEY) ?? null } catch { return null } }
export function saveLast(id: string, s: S | null = store()) { try { s?.setItem(LAST_KEY, id) } catch { /* ignore */ } }

export type Group = { key: string; label: string; hint?: string; chapters: Chapter[] }
/** Groups chapters by their topic when they carry one (in order of first appearance), else by audience. */
export function groupChapters(list: readonly Chapter[], audienceGroups: { id: Chapter['audience']; label: string; hint: string }[]): Group[] {
  if (list.some((c) => c.topic)) {
    const order: string[] = []
    const by = new Map<string, Chapter[]>()
    for (const c of list) {
      const k = c.topic ?? 'مواضيع أخرى'
      if (!by.has(k)) { by.set(k, []); order.push(k) }
      by.get(k)!.push(c)
    }
    return order.map((k) => ({ key: k, label: k, chapters: by.get(k)! }))
  }
  return audienceGroups.map((g) => ({ key: g.id, label: g.label, hint: g.hint, chapters: list.filter((c) => c.audience === g.id) })).filter((g) => g.chapters.length > 0)
}
