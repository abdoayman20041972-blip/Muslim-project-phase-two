import type { StoryContent } from './storyTypes'
import { MUSA_STORY_PART_1 } from './musaScenes1'
import { MUSA_STORY_PART_2 } from './musaScenes2'
import { MUSA_STORY_PART_3 } from './musaScenes3'

export const MUSA_STORY: StoryContent = {
 id: 'musa',
 intro: {"v": [], "hd": {"t": "«لَمَّا قَدِمَ النَّبِيُّ صلى الله عليه وسلم الْمَدِينَةَ وَجَدَ الْيَهُودَ يَصُومُونَ عَاشُورَاءَ، فَسُئِلُوا عَنْ ذَلِكَ، فَقَالُوا هَذَا الْيَوْمُ الَّذِي أَظْفَرَ اللَّهُ فِيهِ مُوسَى وَبَنِي إِسْرَائِيلَ عَلَى فِرْعَوْنَ، وَنَحْنُ نَصُومُهُ تَعْظِيمًا لَهُ، فَقَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم نَحْنُ أَوْلَى بِمُوسَى مِنْكُمْ»", "s": "رواه البخاري (٣٩٤٣) عن ابن عباس رضي الله عنهما"}},
 scenes: [...MUSA_STORY_PART_1, ...MUSA_STORY_PART_2, ...MUSA_STORY_PART_3],
}
