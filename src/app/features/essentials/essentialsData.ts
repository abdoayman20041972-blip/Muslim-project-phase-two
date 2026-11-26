import type { Chapter } from './essentialsTypes'

/**
 * Chapters of "ما لا يسع المسلم جهله" that ship inside the app.
 *
 * Empty on purpose. No chapter text is written into the public repository until (1) the reuse permission of each
 * source is verified, (2) a named scholar has reviewed the exact text and (3) it is proofread. `shippableChapters`
 * hides anything that misses one of these. The More tab always shows the entry. Personal chapters come from a
 * content pack stored on the device (see essentialsPack.ts and essentialsPreinstall.ts), never from this file.
 * The plan, source coverage and open decisions are in docs/ESSENTIALS-PLAN.md.
 */
export const ESSENTIALS_CHAPTERS: readonly Chapter[] = []
