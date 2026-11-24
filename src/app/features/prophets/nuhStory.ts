import type { StoryContent } from './storyTypes'
import { NUH_STORY_PART_1 } from './nuhScenes1'
import { NUH_STORY_PART_2 } from './nuhScenes2'

export const NUH_STORY: StoryContent = {
 id: 'nuh',
 intro: {"v": [[17, 3, 3]], "hd": {"t": "«فَيَأْتُونَ نُوحًا فَيَقُولُونَ يَا نُوحُ أَنْتَ أَوَّلُ الرُّسُلِ إِلَى أَهْلِ الأَرْضِ، وَسَمَّاكَ اللَّهُ عَبْدًا شَكُورًا»", "s": "رواه البخاري (٣٣٤٠) عن أبي هريرة رضي الله عنه"}},
 scenes: [...NUH_STORY_PART_1, ...NUH_STORY_PART_2],
}
