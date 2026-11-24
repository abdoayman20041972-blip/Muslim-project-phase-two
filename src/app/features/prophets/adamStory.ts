import type { StoryContent } from './storyTypes'
import { ADAM_STORY_PART_1 } from './adamScenes1'
import { ADAM_STORY_PART_2 } from './adamScenes2'

export const ADAM_STORY: StoryContent = {
 id: 'adam',
 intro: {"v": [[3, 59, 59]], "hd": {"t": "«خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ فِيهِ خُلِقَ آدَمُ وَفِيهِ أُدْخِلَ الْجَنَّةَ وَفِيهِ أُخْرِجَ مِنْهَا»", "s": "رواه مسلم (٨٥٤) عن أبي هريرة رضي الله عنه"}},
 scenes: [...ADAM_STORY_PART_1, ...ADAM_STORY_PART_2],
}
