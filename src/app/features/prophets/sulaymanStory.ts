import type { StoryContent } from './storyTypes'
import { SULAYMAN_STORY_PART_1 } from './sulaymanScenes1'
import { SULAYMAN_STORY_PART_2 } from './sulaymanScenes2'

export const SULAYMAN_STORY: StoryContent = {
 id: 'sulayman',
 intro: {"v": [[38, 30, 30]], "hd": {"t": "«قَالَ سُلَيْمَانُ بْنُ دَاوُدَ لأَطُوفَنَّ اللَّيْلَةَ عَلَى سَبْعِينَ امْرَأَةً تَحْمِلُ كُلُّ امْرَأَةٍ فَارِسًا يُجَاهِدُ فِي سَبِيلِ اللَّهِ، فَقَالَ لَهُ صَاحِبُهُ إِنْ شَاءَ اللَّهُ. فَلَمْ يَقُلْ، وَلَمْ تَحْمِلْ شَيْئًا إِلاَّ وَاحِدًا سَاقِطًا إِحْدَى شِقَّيْهِ»", "s": "رواه البخاري (٣٤٢٤) عن أبي هريرة رضي الله عنه"}},
 scenes: [...SULAYMAN_STORY_PART_1, ...SULAYMAN_STORY_PART_2],
}
