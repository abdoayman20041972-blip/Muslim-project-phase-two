import type { StoryContent } from './storyTypes'
import { YUNUS_STORY_PART_1 } from './yunusScenes1'
import { YUNUS_STORY_PART_2 } from './yunusScenes2'

export const YUNUS_STORY: StoryContent = {
 id: 'yunus',
 intro: {"v": [[21, 87, 88]], "hd": {"t": "«مَا يَنْبَغِي لِعَبْدٍ أَنْ يَقُولَ أَنَا خَيْرٌ مِنْ يُونُسَ بْنِ مَتَّى»", "s": "رواه البخاري (٤٦٣١) عن أبي هريرة رضي الله عنه"}},
 scenes: [...YUNUS_STORY_PART_1, ...YUNUS_STORY_PART_2],
}
