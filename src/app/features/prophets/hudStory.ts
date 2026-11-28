import type { StoryContent } from './storyTypes'
import { HUD_STORY_PART_1 } from './hudScenes1'
import { HUD_STORY_PART_2 } from './hudScenes2'

export const HUD_STORY: StoryContent = {
 id: 'hud',
 intro: {"v": [], "hd": {"t": "«نُصِرْتُ بِالصَّبَا وَأُهْلِكَتْ عَادٌ بِالدَّبُورِ»", "s": "رواه البخاري (٤١٠٥) عن ابن عباس رضي الله عنهما"}},
 scenes: [...HUD_STORY_PART_1, ...HUD_STORY_PART_2],
}
