import type { StoryContent } from './storyTypes'
import { ISA_STORY_PART_1 } from './isaScenes1'
import { ISA_STORY_PART_2 } from './isaScenes2'

export const ISA_STORY: StoryContent = {
 id: 'isa',
 intro: {"v": [[3, 59, 59]], "hd": {"t": "«أَنَا أَوْلَى النَّاسِ بِابْنِ مَرْيَمَ، وَالأَنْبِيَاءُ أَوْلاَدُ عَلاَّتٍ، لَيْسَ بَيْنِي وَبَيْنَهُ نَبِيٌّ»", "s": "رواه البخاري (٣٤٤٢) عن أبي هريرة رضي الله عنه"}},
 scenes: [...ISA_STORY_PART_1, ...ISA_STORY_PART_2],
}
