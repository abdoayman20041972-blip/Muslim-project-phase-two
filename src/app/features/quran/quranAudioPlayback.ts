import { quranAudioUrl, quranSurahAudioUrl } from '@/app/constants'

export const QURAN_AUDIO_RECITERS = [
  'ar.minshawi','ar.alafasy','ar.husary','ar.abdulbasitmurattal',
  'ar.abdurrahmaansudais','ar.mahermuaiqly','ar.hudhaify','ar.saoodshuraym',
  'ar.ahmedajamy','ar.shaatree',
] as const

export type QuranAudioReciter = (typeof QURAN_AUDIO_RECITERS)[number]

export const QURAN_AUDIO_RECITER_LABELS: Record<QuranAudioReciter, string> = {
  'ar.minshawi': 'محمد صديق المنشاوي',
  'ar.alafasy': 'مشاري العفاسي',
  'ar.husary': 'محمود خليل الحصري',
  'ar.abdulbasitmurattal': 'عبد الباسط عبد الصمد',
  'ar.abdurrahmaansudais': 'عبد الرحمن السديس',
  'ar.mahermuaiqly': 'ماهر المعيقلي',
  'ar.hudhaify': 'علي الحذيفي',
  'ar.saoodshuraym': 'سعود الشريم',
  'ar.ahmedajamy': 'أحمد العجمي',
  'ar.shaatree': 'أبو بكر الشاطري',
}

export type SingleAyahPlayback = {
  kind: 'single-ayah'
  reciter: QuranAudioReciter
  ayahNumber: number
  source: string
}

export type ConnectedPlayback = {
  kind: 'connected'
  reciter: QuranAudioReciter
  surahNumber: number
  source: string
}

export function isQuranAudioReciter(value: string): value is QuranAudioReciter {
  return (QURAN_AUDIO_RECITERS as readonly string[]).includes(value)
}

export function createSingleAyahPlayback(reciter: QuranAudioReciter, ayahNumber: number): SingleAyahPlayback {
  if (!Number.isInteger(ayahNumber) || ayahNumber < 1) throw new RangeError('ayahNumber must be a positive integer')
  return { kind: 'single-ayah', reciter, ayahNumber, source: quranAudioUrl(reciter, ayahNumber) }
}

export function createConnectedPlayback(
  reciter: QuranAudioReciter,
  surahNumber: number,
): ConnectedPlayback {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) throw new RangeError('surahNumber must be between 1 and 114')
  return { kind: 'connected', reciter, surahNumber, source: quranSurahAudioUrl(reciter, surahNumber) }
}
