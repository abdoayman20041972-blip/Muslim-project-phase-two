import type { StoryContent } from './storyTypes'
import { IBRAHIM_STORY_PART_1 } from './ibrahimScenes1'
import { IBRAHIM_STORY_PART_2 } from './ibrahimScenes2'
import { IBRAHIM_STORY_PART_3 } from './ibrahimScenes3'

export const IBRAHIM_STORY: StoryContent = {
 id: 'ibrahim',
 intro: {"v": [[4, 125, 125]], "hd": {"t": "«وَأَوَّلُ مَنْ يُكْسَى يَوْمَ الْقِيَامَةِ إِبْرَاهِيمُ»", "s": "رواه البخاري (٣٣٤٩) عن ابن عباس رضي الله عنهما"}},
 scenes: [...IBRAHIM_STORY_PART_1, ...IBRAHIM_STORY_PART_2, ...IBRAHIM_STORY_PART_3],
}
