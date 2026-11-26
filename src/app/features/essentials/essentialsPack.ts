import { chapterProblems } from './essentialsGate'
import { SECTION_LABELS, SECTION_ORDER, type Chapter, type SectionKind } from './essentialsTypes'

/**
 * A content pack is a JSON file the user puts on the phone. It is stored on the device only and never ships in
 * the app or the repository, so protected book text stays out of the public GitHub repo and the APK.
 * Format: { "version": 1, "chapters": Chapter[] }  (see essentialsTypes.ts)
 */
export const PACK_KEY = 'essentials-pack-v1'
export const PACK_MAX_BYTES = 3_000_000

export type PackResult = { chapters: Chapter[]; rejected: { id: string; problems: string[] }[]; error?: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStrArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string')

function shapeOk(c: unknown): c is Chapter {
  if (!isObj(c)) return false
  if (typeof c.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(c.id)) return false
  if (typeof c.title !== 'string' || typeof c.summary !== 'string') return false
  if (c.audience !== 'universal' && c.audience !== 'situational') return false
  if (c.topic !== undefined && typeof c.topic !== 'string') return false
  if (!isObj(c.sections) || !Array.isArray(c.sources)) return false
  for (const k of Object.keys(c.sections)) {
    if (!(SECTION_ORDER as readonly string[]).includes(k)) return false
    const b = (c.sections as Record<string, unknown>)[k]
    if (!isObj(b)) return false
    if (b.paragraphs !== undefined && !isStrArr(b.paragraphs)) return false
    if (b.label !== undefined && typeof b.label !== 'string') return false
    if (b.items !== undefined && !isStrArr(b.items)) return false
  }
  if (c.scholarReview !== undefined && !(isObj(c.scholarReview) && typeof c.scholarReview.reviewer === 'string' && typeof c.scholarReview.date === 'string')) return false
  if (c.proofread !== undefined && !(isObj(c.proofread) && typeof c.proofread.by === 'string' && typeof c.proofread.date === 'string')) return false
  if (c.held !== undefined && !isStrArr(c.held)) return false
  return c.sources.every((s) => isObj(s) && typeof s.title === 'string' && ['open-verified', 'original', 'unverified'].includes(s.rights as string))
}

/**
 * Parses a pack. Chapters that fail the gate (no explanation, thin sections, no sources, lint hits) are rejected with their reasons.
 * Personal packs may carry unverified rights and unreviewed chapters. The gate checks shape and wording only: it cannot prove who reviewed a chapter or that its content is correct.
 */
export function parsePack(raw: string): PackResult {
  if (new TextEncoder().encode(raw).length > PACK_MAX_BYTES) return { chapters: [], rejected: [], error: 'too-large' }
  let data: unknown
  try { data = JSON.parse(raw) } catch { return { chapters: [], rejected: [], error: 'invalid-json' } }
  if (!isObj(data) || data.version !== 1 || !Array.isArray(data.chapters)) return { chapters: [], rejected: [], error: 'wrong-format' }
  const chapters: Chapter[] = []
  const rejected: PackResult['rejected'] = []
  const seen = new Set<string>()
  for (const c of data.chapters) {
    if (!shapeOk(c)) { rejected.push({ id: isObj(c) && typeof c.id === 'string' ? c.id : '?', problems: ['bad-shape'] }); continue }
    if (seen.has(c.id)) { rejected.push({ id: c.id, problems: ['duplicate-id'] }); continue }
    seen.add(c.id)
    const problems = chapterProblems(c, { allowUnverifiedRights: true, allowUnreviewed: true })
    if (problems.length) rejected.push({ id: c.id, problems })
    else chapters.push(c)
  }
  return { chapters, rejected }
}

export function loadPack(storage: Pick<Storage, 'getItem'> = localStorage): Chapter[] {
  try {
    const raw = storage.getItem(PACK_KEY)
    return raw ? parsePack(raw).chapters : []
  } catch { return [] }
}

/** Saves only a pack that parsed without error and has at least one passing chapter. Returns false if storage refused it. */
export function savePack(raw: string, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  const r = parsePack(raw)
  if (r.error || r.chapters.length === 0) return false
  try { storage.setItem(PACK_KEY, raw); return true } catch { return false }
}

export function clearPack(storage: Pick<Storage, 'removeItem'> = localStorage) {
  try { storage.removeItem(PACK_KEY) } catch { /* ignore */ }
}

const FSI = '\u2068'
const PDI = '\u2069'
/** Arabic wording for one rejection code from the gate. Unknown codes are shown as a generic phrase, never as raw English. */
export function problemLabel(code: string): string {
  if (code === 'section-missing:explanation') return 'قسم الشرح ناقص'
  if (code.startsWith('section-thin:')) {
    const kind = code.slice('section-thin:'.length) as SectionKind
    return `قسم «${SECTION_LABELS[kind] ?? 'غير معروف'}» قصير جدًا`
  }
  if (code === 'no-sources') return 'بلا مصادر'
  if (code === 'rights-unverified') return 'حقوق المصدر غير موثقة'
  if (code === 'no-scholar-review') return 'لم يراجعه عالم'
  if (code === 'not-proofread') return 'لم يُدقق لغويًا'
  if (code.startsWith('text-lint:')) return 'فيه عبارة غير مسموحة'
  if (code === 'bad-shape') return 'شكل الفصل غير صحيح'
  if (code === 'duplicate-id') return 'معرّف مكرر'
  return 'سبب غير معروف'
}
/** One rejected chapter as a right-to-left line. The Latin id is isolated so it cannot reorder the Arabic around it. */
export function rejectedLine(r: { id: string; problems: string[] }): string {
  return `${FSI}${r.id}${PDI}: ${r.problems.map(problemLabel).join('، ')}`
}
