import type { StoryContent } from './storyTypes'
import { SALIH_STORY_PART_1 } from './salihScenes1'
import { SALIH_STORY_PART_2 } from './salihScenes2'

export const SALIH_STORY: StoryContent = {
 id: 'salih',
 intro: {"v": [[7, 73, 73]], "hd": {"t": "«لاَ تَدْخُلُوا عَلَى هَؤُلاَءِ الْمُعَذَّبِينَ إِلاَّ أَنْ تَكُونُوا بَاكِينَ، فَإِنْ لَمْ تَكُونُوا بَاكِينَ فَلاَ تَدْخُلُوا عَلَيْهِمْ، لاَ يُصِيبُكُمْ مَا أَصَابَهُمْ»", "s": "رواه البخاري (٤٣٣) عن عبد الله بن عمر رضي الله عنهما"}},
 scenes: [...SALIH_STORY_PART_1, ...SALIH_STORY_PART_2],
}
