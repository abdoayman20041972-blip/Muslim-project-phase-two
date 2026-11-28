import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

// Reading position of the prophet stories: one JSON map { storyId: sceneId } in a single setting.
// Both ids are stable names (the prophet id and the scene heading), never list positions, so
// reordering the list or the scenes cannot point a saved position at the wrong place.
export type SceneRef = { id: string }

/** Stable id of a scene: its heading (unique inside a story, and what the reader shows). */
export const sceneId = (heading: string) => heading.trim()

export function readPositions(): Record<string, string> {
  try {
    const raw = JSON.parse(readSetting(APP_SETTINGS_KEYS.prophetPosition, '{}')) as unknown
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'string' && v) out[k] = v
    return out
  } catch {
    return {}
  }
}

export function readPosition(storyId: string): string | null {
  return readPositions()[storyId] ?? null
}

export function savePosition(storyId: string, scene: string) {
  const all = readPositions()
  if (all[storyId] === scene) return
  all[storyId] = scene
  writeSetting(APP_SETTINGS_KEYS.prophetPosition, JSON.stringify(all))
}

/** The scene to resume at: the saved one, only if it still exists in the story and is not the first. */
export function resumeScene(storyId: string, headings: string[]): string | null {
  const saved = readPosition(storyId)
  if (!saved) return null
  const i = headings.findIndex((h) => sceneId(h) === saved)
  return i > 0 ? headings[i] : null
}
