import { describe, expect, it } from 'vitest'
import { PROPHET_STORIES } from '../../src/app/features/prophets/prophetsData'
import { DETAILED_STORIES } from '../../src/app/features/prophets/storyContent'

// The hand-written scene text in prophetsData.ts / prophetsDataExtended.ts was only reachable through the
// plain-card fallback in ProphetsView. Every story either has detailed content (scenes are replaced by
// withDetail) or is the dedicated Yusuf body, so no story can reach that fallback with empty scenes.
describe('prophet stories never need the base scenes', () => {
  it('every story is yusuf or has detailed content with non-empty scenes', () => {
    expect(PROPHET_STORIES.length).toBeGreaterThanOrEqual(25)
    for (const story of PROPHET_STORIES) {
      expect(story.id === 'yusuf' || Boolean(DETAILED_STORIES[story.id]), story.id).toBe(true)
      expect(story.scenes.length, story.id).toBeGreaterThan(0)
    }
  })
})
