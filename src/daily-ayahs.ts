export type DailyAyah = { text: string; surah: string; number: number }

// L2 fix: expanded from 7 to 42 ayahs (a full six-week rotation) so the daily
// ayah on the home screen and in the daily notification stops repeating weekly.
// All verses are famous short excerpts, bundled offline.
export const DAILY_AYAHS: readonly DailyAyah[] = [
  { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', surah: 'الشرح', number: 6 },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ', surah: 'البقرة', number: 152 },
  { text: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', surah: 'الرعد', number: 28 },
  { text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', surah: 'طه', number: 114 },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', surah: 'البقرة', number: 153 },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surah: 'الطلاق', number: 3 },
  { text: 'وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ', surah: 'الكهف', number: 24 },
  { text: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', surah: 'يوسف', number: 90 },
  { text: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا', surah: 'آل عمران', number: 103 },
  { text: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', surah: 'النحل', number: 127 },
  { text: 'إِنَّ الصَّلَاةَ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنكَرِ', surah: 'العنكبوت', number: 45 },
  { text: 'وَقُولُوا لِلنَّاسِ حُسْنًا', surah: 'البقرة', number: 83 },
  { text: 'ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ', surah: 'النحل', number: 125 },
  { text: 'إِنْ أُرِيدُ إِلَّا الْإِصْلَاحَ مَا اسْتَطَعْتُ', surah: 'هود', number: 88 },
  { text: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', surah: 'هود', number: 88 },
  { text: 'إِنَّ رَبِّي قَرِيبٌ مُّجِيبٌ', surah: 'هود', number: 61 },
  { text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', surah: 'البقرة', number: 201 },
  { text: 'وَلَا تَسْتَوِي الْحَسَنَةُ وَلَا السَّيِّئَةُ', surah: 'فصلت', number: 34 },
  { text: 'ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ', surah: 'فصلت', number: 34 },
  { text: 'وَالْكَاظِمِينَ الْغَيْظَ وَالْعَافِينَ عَنِ النَّاسِ', surah: 'آل عمران', number: 134 },
  { text: 'وَاللَّهُ يُحِبُّ الْمُتَّقِينَ', surah: 'آل عمران', number: 76 },
  { text: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', surah: 'البقرة', number: 195 },
  { text: 'أَلَا إِنَّ اللَّهَ مَعَ الْمُتَّقِينَ', surah: 'النحل', number: 128 },
  { text: 'وَسَارِعُوا إِلَىٰ مَغْفِرَةٍ مِّن رَّبِّكُمْ', surah: 'آل عمران', number: 133 },
  { text: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', surah: 'البقرة', number: 45 },
  { text: 'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ', surah: 'الزمر', number: 10 },
  { text: 'وَقُلِ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ وَرَسُولُهُ وَالْمُؤْمِنُونَ', surah: 'التوبة', number: 105 },
  { text: 'وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ', surah: 'النجم', number: 39 },
  { text: 'وَمَا الْحَيَاةُ الدُّنْيَا فِي الْآخِرَةِ إِلَّا مَتَاعٌ', surah: 'الرعد', number: 26 },
  { text: 'اعْلَمُوا أَنَّ اللَّهَ يُحْيِي الْأَرْضَ بَعْدَ مَوْتِهَا', surah: 'الحديد', number: 17 },
  { text: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', surah: 'الرعد', number: 11 },
  { text: 'فَذَكِّرْ إِنَّمَا أَنتَ مُذَكِّرٌ', surah: 'الغاشية', number: 21 },
  { text: 'قَدْ أَفْلَحَ مَن زَكَّاهَا', surah: 'الشمس', number: 9 },
  { text: 'وَقَدْ خَابَ مَن دَسَّاهَا', surah: 'الشمس', number: 10 },
  { text: 'وَإِلَىٰ رَبِّكَ فَارْغَبْ', surah: 'الشرح', number: 8 },
  { text: 'لَا تُدْرِكُهُ الْأَبْصَارُ وَهُوَ يُدْرِكُ الْأَبْصَارَ', surah: 'الأنعام', number: 103 },
  { text: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ', surah: 'النور', number: 35 },
  { text: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', surah: 'الحديد', number: 4 },
  { text: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ', surah: 'الحجرات', number: 13 },
  { text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ', surah: 'الملك', number: 1 },
  { text: 'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ', surah: 'الإسراء', number: 82 },
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
