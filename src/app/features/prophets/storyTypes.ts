// Shared shape of the detailed prophet stories (all except Yusuf, which keeps yusufStory.ts).
// Quran text is never stored here: each verse entry is [surah number, first ayah, last ayah]
// and is read at runtime from the app mushaf.
export type StoryPara =
  | { k: 'n'; t: string }
  | { k: 't'; w: string; t: string }

export type StoryVerse = [number, number, number]

export type StoryScene = {
  h: string
  p: StoryPara[]
  v: StoryVerse[]
  hd?: { t: string; s: string }
}

export type StoryContent = {
  id: string
  intro?: { v: StoryVerse[]; hd?: { t: string; s: string } }
  scenes: StoryScene[]
}
