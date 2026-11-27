import { hasBottomNav, type View } from './constants'

export const VIEW_HISTORY_LIMIT = 50

export function sameView(a: View, b: View): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * History after the user moved from `from` to `to` by tapping something (not by going back).
 * - Same screen: unchanged.
 * - A bottom-bar tab starts a fresh root: back from a non-home tab goes to home, never a long chain.
 * - Returning to the screen we came from counts as going back, not as a new entry.
 * - Otherwise `from` is pushed, capped.
 */
export function recordNavigation(history: View[], from: View, to: View): View[] {
  if (sameView(from, to)) return history
  if (hasBottomNav(to)) return to.name === 'home' ? [] : [{ name: 'home' }]
  const last = history[history.length - 1]
  if (last && sameView(last, to)) return history.slice(0, -1)
  const next = [...history, from]
  return next.length > VIEW_HISTORY_LIMIT ? next.slice(next.length - VIEW_HISTORY_LIMIT) : next
}
