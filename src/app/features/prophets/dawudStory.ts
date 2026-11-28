import type { StoryContent } from './storyTypes'
import { DAWUD_STORY_PART_1 } from './dawudScenes1'
import { DAWUD_STORY_PART_2 } from './dawudScenes2'

export const DAWUD_STORY: StoryContent = {
 id: 'dawud',
 intro: {"v": [[38, 17, 20]], "hd": {"t": "«أَحَبُّ الصِّيَامِ إِلَى اللَّهِ صِيَامُ دَاوُدَ، كَانَ يَصُومُ يَوْمًا وَيُفْطِرُ يَوْمًا، وَأَحَبُّ الصَّلاَةِ إِلَى اللَّهِ صَلاَةُ دَاوُدَ، كَانَ يَنَامُ نِصْفَ اللَّيْلِ وَيَقُومُ ثُلُثَهُ وَيَنَامُ سُدُسَهُ»", "s": "رواه البخاري (٣٤٢٠) عن عبد الله بن عمرو رضي الله عنهما"}},
 scenes: [...DAWUD_STORY_PART_1, ...DAWUD_STORY_PART_2],
}
