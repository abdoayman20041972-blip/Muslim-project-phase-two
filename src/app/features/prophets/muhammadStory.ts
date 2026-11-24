import type { StoryContent } from './storyTypes'
import { MUHAMMAD_STORY_PART_1 } from './muhammadScenes1'
import { MUHAMMAD_STORY_PART_2 } from './muhammadScenes2'

export const MUHAMMAD_STORY: StoryContent = {
 id: 'muhammad',
 intro: {"v": [[33, 40, 40]], "hd": {"t": "«كُنْتُ مَعَ النَّبِيِّ صلى الله عليه وسلم فِي الْغَارِ، فَرَأَيْتُ آثَارَ الْمُشْرِكِينَ قُلْتُ يَا رَسُولَ اللَّهِ، لَوْ أَنَّ أَحَدَهُمْ رَفَعَ قَدَمَهُ رَآنَا. قَالَ \" مَا ظَنُّكَ بِاثْنَيْنِ اللَّهُ ثَالِثُهُمَا»", "s": "رواه البخاري (٤٦٦٣) عن أبي بكر الصديق رضي الله عنه"}},
 scenes: [...MUHAMMAD_STORY_PART_1, ...MUHAMMAD_STORY_PART_2],
}
