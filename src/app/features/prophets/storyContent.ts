import type { StoryContent } from './storyTypes'
import { NUH_STORY } from './nuhStory'
import { IBRAHIM_STORY } from './ibrahimStory'
import { MUSA_STORY } from './musaStory'
import { DAWUD_STORY } from './dawudStory'
import { SULAYMAN_STORY } from './sulaymanStory'
import { AYYUB_STORY } from './ayyubStory'
import { YUNUS_STORY } from './yunusStory'
import { SALIH_STORY } from './salihStory'

// Detailed stories by prophet id. A story listed here is shown with the shared story body;
// the card summary, verse and lessons stay in prophetsData.ts.
export const DETAILED_STORIES: Record<string, StoryContent> = {
  nuh: NUH_STORY,
  ibrahim: IBRAHIM_STORY,
  musa: MUSA_STORY,
  dawud: DAWUD_STORY,
  sulayman: SULAYMAN_STORY,
  ayyub: AYYUB_STORY,
  yunus: YUNUS_STORY,
  salih: SALIH_STORY,
}
