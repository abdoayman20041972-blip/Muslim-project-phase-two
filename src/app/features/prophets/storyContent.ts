import type { StoryContent } from './storyTypes'
import { NUH_STORY } from './nuhStory'

// Detailed stories by prophet id. A story listed here is shown with the shared story body;
// the card summary, verse and lessons stay in prophetsData.ts.
export const DETAILED_STORIES: Record<string, StoryContent> = {
  nuh: NUH_STORY,
}
