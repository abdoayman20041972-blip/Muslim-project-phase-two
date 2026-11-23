import { readFile } from 'node:fs/promises'
import { assertQuranPageMap } from '../src/app/features/quran/quranPageIntegrity.ts'
import { surahList } from '../src/quran-meta.ts'

const path = process.argv[2] ?? 'src/app/features/quran/data/quran-pages.json'
const pages = JSON.parse(await readFile(path, 'utf8'))
assertQuranPageMap(pages, surahList)
console.log('Quran page map verified: 604 non-empty pages, 6236 ordered unique references, 114 surahs.')
