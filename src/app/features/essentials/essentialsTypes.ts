/** The parts a chapter of "ما لا يسع المسلم جهله" may carry, in reading order. Only the explanation is required; the rest appear when the source supports them. */
export const SECTION_ORDER = ['idea', 'explanation', 'examples', 'steps', 'mistakes', 'evidence', 'khilaf', 'review'] as const
export type SectionKind = (typeof SECTION_ORDER)[number]

export const SECTION_LABELS: Record<SectionKind, string> = {
  idea: 'الفكرة في دقيقة',
  explanation: 'الشرح',
  examples: 'أمثلة من الحياة',
  steps: 'الخطوات العملية',
  mistakes: 'أخطاء شائعة',
  evidence: 'الدليل ومعناه',
  khilaf: 'إن كان فيه خلاف',
  review: 'راجع نفسك',
}

/**
 * Where a chapter's text comes from, as far as its reuse permission is known.
 * - open-verified: the exact file carries a notice that allows this use (the notice is recorded in `note`).
 * - original: written for the app from named sources, reviewed; no protected text copied.
 * - unverified: permission not established. A chapter with any such source never ships.
 */
export type Rights = 'open-verified' | 'original' | 'unverified'

export type SourceRef = { title: string; url?: string; rights: Rights; note?: string }

export type SectionBody = {
  paragraphs?: string[]
  items?: string[]
  /** Optional heading that replaces the default label when the default would mislead (for example a list of who may break the fast under the examples slot). */
  label?: string
  /** Where in the named source this text comes from (chapter/heading), so each part can be traced. */
  from?: string
}

export type Chapter = {
  id: string
  title: string
  audience: 'universal' | 'situational'
  /** Optional heading the list groups chapters under (for example الطهارة). Chapters without one are grouped by audience. */
  topic?: string
  /** Short line on the list: who needs this and why. */
  summary: string
  sections: Partial<Record<SectionKind, SectionBody>>
  sources: SourceRef[]
  /** Claims the source states but that stay out of the reading text until a scholar settles them (for example a ruling the source itself picks among several views). */
  held?: string[]
  /** Set only after a named scholar has read this exact text. Recorded as given: the app cannot verify the person or the review. */
  scholarReview?: { reviewer: string; date: string }
  /** Set only after a human proofread of this exact text. */
  proofread?: { by: string; date: string }
}
