import type { StoryContent } from './storyTypes'
import { NUH_STORY } from './nuhStory'
import { IBRAHIM_STORY } from './ibrahimStory'
import { MUSA_STORY } from './musaStory'
import { DAWUD_STORY } from './dawudStory'
import { SULAYMAN_STORY } from './sulaymanStory'
import { AYYUB_STORY } from './ayyubStory'
import { YUNUS_STORY } from './yunusStory'
import { SALIH_STORY } from './salihStory'
import { HUD_STORY } from './hudStory'
import { ISA_STORY } from './isaStory'
import { MUHAMMAD_STORY } from './muhammadStory'
import { ADAM_STORY } from './adamStory'
import { ILYAS_STORY } from './ilyasStory'
import { HARUN_STORY } from './harunStory'
import { SHUAYB_STORY } from './shuaybStory'
import { LUT_STORY } from './lutStory'
import { YAQUB_STORY } from './yaqubStory'
import { ISHAQ_STORY } from './ishaqStory'
import { ISMAIL_STORY } from './ismailStory'
import { YAHYA_STORY } from './yahyaStory'
import { ZAKARIYA_STORY } from './zakariyaStory'
import { AL_YASA_STORY } from './alYasaStory'
import { DHU_AL_KIFL_STORY } from './dhuAlKiflStory'
import { IDRIS_STORY } from './idrisStory'

// Detailed stories by prophet id. A story listed here is shown with the shared story body;
// the card summary, verse and lessons stay in prophetsData.ts.
export const DETAILED_STORIES: Record<string, StoryContent> = {
  nuh: NUH_STORY,
  ibrahim: IBRAHIM_STORY,
  musa: MUSA_STORY,
  dawud: DAWUD_STORY,
  sulayman: SULAYMAN_STORY,
  ayyub: AYYUB_STORY,
  yunus: YUNUS_STORY,
  salih: SALIH_STORY,
  hud: HUD_STORY,
  isa: ISA_STORY,
  muhammad: MUHAMMAD_STORY,
  adam: ADAM_STORY,
  ilyas: ILYAS_STORY,
  harun: HARUN_STORY,
  shuayb: SHUAYB_STORY,
  lut: LUT_STORY,
  yaqub: YAQUB_STORY,
  ishaq: ISHAQ_STORY,
  ismail: ISMAIL_STORY,
  yahya: YAHYA_STORY,
  zakariya: ZAKARIYA_STORY,
  'al-yasa': AL_YASA_STORY,
  'dhu-al-kifl': DHU_AL_KIFL_STORY,
  idris: IDRIS_STORY,
}
