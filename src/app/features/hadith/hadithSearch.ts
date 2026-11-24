const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200F\u202A-\u202E]/g

const FOLD: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ى': 'ي', 'ی': 'ي', 'ئ': 'ي',
  'ک': 'ك',
  'ؤ': 'و',
}

/** Normalised form of one character, or '' when it carries no letter (diacritics, tatweel, bidi controls). */
function foldChar(ch: string): string {
  if (DIACRITICS.test(ch)) {
    DIACRITICS.lastIndex = 0
    return ''
  }
  DIACRITICS.lastIndex = 0
  return FOLD[ch] ?? ch
}

export function normalizeArabic(text: string): string {
  let out = ''
  for (const ch of text) out += foldChar(ch)
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Splits `text` around every match of `query` (compared after normalisation) so the original,
 * fully vowelled text is shown with the matching span marked.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const needle = normalizeArabic(query)
  if (!needle) return [{ text, match: false }]
  const chars = [...text]
  let norm = ''
  const map: number[] = []
  chars.forEach((ch, i) => {
    const f = foldChar(ch)
    for (const c of f) {
      if (/\s/u.test(c)) {
        // Search collapses whitespace, so highlighting must use the same form.
        if (!norm || norm.endsWith(' ')) continue
        norm += ' '
      } else {
        norm += c
      }
      map.push(i)
    }
  })
  const parts: { text: string; match: boolean }[] = []
  let from = 0
  let cursor = 0
  for (;;) {
    const at = norm.indexOf(needle, from)
    if (at < 0) break
    const start = map[at]
    let end = map[at + needle.length - 1] + 1
    while (end < chars.length && foldChar(chars[end]) === '') end++
    if (start >= cursor) {
      if (start > cursor) parts.push({ text: chars.slice(cursor, start).join(''), match: false })
      parts.push({ text: chars.slice(start, end).join(''), match: true })
      cursor = end
    }
    from = at + needle.length
  }
  if (cursor < chars.length) parts.push({ text: chars.slice(cursor).join(''), match: false })
  return parts.length ? parts : [{ text, match: false }]
}

export function matches(text: string, query: string): boolean {
  const needle = normalizeArabic(query)
  return !needle || normalizeArabic(text).includes(needle)
}
