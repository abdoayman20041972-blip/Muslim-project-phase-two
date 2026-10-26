export type ZikrReferenceKind =
  | 'bracketed'
  | 'hadith-attribution'
  | 'muttafaq-alayh'
  | 'quranic-free'
  | 'free-text'
  | 'embedded-attribution'
  | 'stop'

export interface ParsedZikrReference {
  kind: ZikrReferenceKind
  value: string
  ignored: boolean
}

const QURANIC_REFERENCE_MARKERS = ['آية', 'دعاء', 'سورة', 'آل عمران', 'طه']

export function parseReference(source: string): ParsedZikrReference {
  const value = source.trim()

  if (value.toLowerCase() === 'stop') {
    return { kind: 'stop', value, ignored: true }
  }

  const openBracket = value.lastIndexOf('[')
  const closeBracket = value.lastIndexOf(']')
  const beforeClose = value.slice(closeBracket + 1).trim()
  if (openBracket >= 0 && closeBracket > openBracket && (beforeClose === '' || beforeClose === '.')) {
    return { kind: 'bracketed', value, ignored: false }
  }

  if (value.startsWith('رواه')) {
    return { kind: 'hadith-attribution', value, ignored: false }
  }

  if (value.includes('متفق عليه')) {
    return { kind: 'muttafaq-alayh', value, ignored: false }
  }

  if (value.includes('— رواه')) {
    return { kind: 'embedded-attribution', value, ignored: false }
  }

  if (QURANIC_REFERENCE_MARKERS.some(marker => value.includes(marker))) {
    return { kind: 'quranic-free', value, ignored: false }
  }

  return { kind: 'free-text', value, ignored: false }
}
