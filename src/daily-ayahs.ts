export type DailyAyah = { text: string; surah: string; number: number }

export const DAILY_AYAHS: readonly DailyAyah[] = [
  { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', surah: 'الشرح', number: 6 },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ', surah: 'البقرة', number: 152 },
  { text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', surah: 'الرعد', number: 28 },
  { text: 'وَقُلْ رَبِّ زِدْنِي عِلْمًا', surah: 'طه', number: 114 },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', surah: 'البقرة', number: 153 },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surah: 'الطلاق', number: 3 },
  { text: 'وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ', surah: 'الكهف', number: 24 },
] as const

export function dailyAyahIndex(date = new Date()): number {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  )
  return ((dayNumber % DAILY_AYAHS.length) + DAILY_AYAHS.length) % DAILY_AYAHS.length
}

export function dailyAyahFor(date = new Date()): DailyAyah {
  return DAILY_AYAHS[dailyAyahIndex(date)]
}

export function dailyAyahDateKey(date = new Date()): string {
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
}
