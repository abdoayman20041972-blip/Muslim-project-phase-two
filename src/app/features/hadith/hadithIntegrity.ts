// Pure integrity helpers for the hadith section. They only inspect data; nothing here
// rewrites a hadith text, reference or grade. Content changes live in
// review/phase1-proposal.json and wait for human review before they reach the data.

export type IntegrityEntry = { id: string; text: string; source: string }

/** Source label shape used by the curated list: «<collection> — <Arabic-Indic number>». */
export const SOURCE_LABEL_RE = /^(صحيح البخاري|صحيح مسلم|سنن الترمذي|سنن أبي داود) — [٠-٩]+$/

/** Strip marks, unify alef/yeh/teh-marbuta forms and drop punctuation, so two spellings of one matn compare equal. */
export function normalizeArabic(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[^\u0621-\u064a]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Groups of entry ids whose normalized text is identical (the same matn listed more than once). */
export function findDuplicateMatns(entries: IntegrityEntry[]): string[][] {
  const groups = new Map<string, string[]>()
  for (const entry of entries) {
    const key = normalizeArabic(entry.text)
    groups.set(key, [...(groups.get(key) ?? []), entry.id])
  }
  return [...groups.values()].filter((ids) => ids.length > 1)
}

export function findMalformedSources(entries: IntegrityEntry[]): string[] {
  return entries.filter((entry) => !SOURCE_LABEL_RE.test(entry.source)).map((entry) => entry.id)
}

/** Persian/Urdu letters that look like Arabic ones but are different code points. */
export const URDU_SCRIPT_LETTERS = /[\u06a9\u06cc]/g

export function findUrduScriptLetters(text: string): string[] {
  return text.match(URDU_SCRIPT_LETTERS) ?? []
}

/** Invisible bidi/format controls that have no business inside a hadith text. */
export const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069\u200e\u200f]/g

export function findBidiControls(text: string): string[] {
  return text.match(BIDI_CONTROLS) ?? []
}

// Words whose final letter is alef maqsura (ى), written with Persian yeh in the Dehlawi data.
export const MAQSURA_WORDS = new Set(['على', 'السفلى', 'يرى', 'التقوى'])

/**
 * Rewrites Persian keheh and yeh to the Arabic letters. Marks, spacing and every other
 * character stay as they are. Final yeh becomes ى only in the words listed above.
 */
export function convertDehlawiOrthography(text: string): string {
  return text.replace(/\S+/g, (word) => {
    let out = word.replace(/\u06a9/g, '\u0643')
    const chars = [...out]
    let last = chars.length - 1
    while (last >= 0 && /\p{M}/u.test(chars[last])) last -= 1
    if (last >= 0 && chars[last] === '\u06cc') {
      const base = chars
        .filter((c) => !/\p{M}/u.test(c))
        .join('')
        .replace(/\u06cc/g, '\u064a')
      const lookup = base.slice(0, -1) + '\u0649'
      chars[last] = MAQSURA_WORDS.has(lookup) ? '\u0649' : '\u064a'
      out = chars.join('')
    }
    return out.replace(/\u06cc/g, '\u064a')
  })
}
