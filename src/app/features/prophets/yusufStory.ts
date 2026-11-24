import { YUSUF_SCENES_PART_1 } from './yusufScenes1'
import { YUSUF_SCENES_PART_2 } from './yusufScenes2'
import { YUSUF_SCENES_PART_3 } from './yusufScenes3'

// Scenes of the Yusuf story (scene data lives in yusufScenes1-3.ts). Quran text is not stored here: each scene lists the
// ayah ranges of Surat Yusuf (12) shown beneath it, read at runtime from the
// app mushaf. Tafsir cards are kept only where the statement was checked
// against the text of Tafsir Ibn Kathir for the same passage.
export type YusufPara =
  | { k: 'n'; t: string }
  | { k: 't'; w: string; t: string }

export type YusufScene = {
  h: string
  p: YusufPara[]
  v: Array<[number, number]>
  hd?: { t: string; s: string }
}

export const YUSUF_INTRO_HADITH = {
  t: '«الْكَرِيمُ ابْنُ الْكَرِيمِ ابْنِ الْكَرِيمِ ابْنِ الْكَرِيمِ يُوسُفُ بْنُ يَعْقُوبَ بْنِ إِسْحَاقَ بْنِ إِبْرَاهِيمَ عَلَيْهِمِ السَّلاَمُ»',
  s: 'رواه البخاري (٤٦٨٨) عن ابن عمر رضي الله عنهما',
}

export const YUSUF_INTRO_VERSES: [number, number] = [1, 3]

export const YUSUF_SCENES: YusufScene[] = [...YUSUF_SCENES_PART_1, ...YUSUF_SCENES_PART_2, ...YUSUF_SCENES_PART_3]
