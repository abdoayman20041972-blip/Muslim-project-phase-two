import { SECTION_ORDER, type Chapter, type SectionBody } from './essentialsTypes'

const BANNED = [/ذكاء اصطناعي/, /\bAI\b/, /TODO|FIXME|lorem/i, /\u0640/, /  +/, /[a-zA-Z]{4,}/]

function textOf(body: SectionBody | undefined): string {
  if (!body) return ''
  return [...(body.paragraphs ?? []), ...(body.items ?? [])].join('\n')
}

/** Everything that stops a chapter from shipping. Empty array means it may ship. */
export type GateOptions = { /** Personal packs may be read before review; the app then shows the chapter as unreviewed. Never true for text built into the app. */ allowUnreviewed?: boolean; /** Personal, on-device packs may carry sources whose reuse permission is unknown. Never true for text built into the app. */ allowUnverifiedRights?: boolean }

export function chapterProblems(chapter: Chapter, options: GateOptions = {}): string[] {
  const problems: string[] = []
  for (const kind of SECTION_ORDER) {
    const body = chapter.sections[kind]
    const len = textOf(body).trim().length
    if (kind === 'explanation' && len < 40) problems.push('section-missing:explanation')
    else if (body && len < 40) problems.push(`section-thin:${kind}`)
  }
  if (chapter.sources.length === 0) problems.push('no-sources')
  if (!options.allowUnverifiedRights && chapter.sources.some((s) => s.rights === 'unverified')) problems.push('rights-unverified')
  if (!options.allowUnreviewed && !chapter.scholarReview) problems.push('no-scholar-review')
  if (!options.allowUnreviewed && !chapter.proofread) problems.push('not-proofread')
  const all = SECTION_ORDER.map((k) => textOf(chapter.sections[k])).join('\n') + '\n' + chapter.title + '\n' + chapter.summary + '\n' + (chapter.held ?? []).join('\n')
  for (const re of BANNED) if (re.test(all)) problems.push(`text-lint:${re.source}`)
  return problems
}

export const isShippable = (chapter: Chapter, options: GateOptions = {}) => chapterProblems(chapter, options).length === 0

export function shippableChapters(chapters: readonly Chapter[], options: GateOptions = {}): Chapter[] {
  return chapters.filter((c) => isShippable(c, options))
}
