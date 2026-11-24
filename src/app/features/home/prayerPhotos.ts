// Real photographs shown on the home prayer card, one per prayer. They are illustrative
// mosques from Wikimedia Commons, not the user's location. Each licence requires
// attribution: the credit line is rendered under the card, with a link to the source page.
export type PrayerPhoto = { src: string; artist: string; license: string; licenseUrl: string; sourceUrl: string; title: string }
export const PRAYER_PHOTOS: Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', PrayerPhoto> = {
  Fajr: { src: '/img/prayer/fajr.jpg', artist: "Nasreddine Nas'h", license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Minaret_de_la_Grande_Mosqu%C3%A9e_Oqba_Ibn_Nafi%C3%AE_au_lever_du_soleil.jpg', title: 'Minaret de la Grande Mosquée Oqba Ibn Nafiî au lever du soleil.jpg' },
  Dhuhr: { src: '/img/prayer/dhuhr.jpg', artist: 'Faraxup', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Beautiful_mosque_minaret_and_blue_sky.jpg', title: 'Beautiful mosque minaret and blue sky.jpg' },
  Asr: { src: '/img/prayer/asr.jpg', artist: 'Jakub Hałun', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kutubiyya_Mosque,_Marrakesh,_Morocco,_20250124_1830_7022_01.jpg', title: 'Kutubiyya Mosque, Marrakesh, Morocco, 20250124 1830 7022 01.jpg' },
  Maghrib: { src: '/img/prayer/maghrib.jpg', artist: 'Rohaan Bhatti', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Badshahi_Mosque_Silhouette_at_sunset.jpg', title: 'Badshahi Mosque Silhouette at sunset.jpg' },
  Isha: { src: '/img/prayer/isha.jpg', artist: 'Furkan Akkurt', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mosque_with_mahya_at_night_Istanbul_2026.jpg', title: 'Mosque with mahya at night Istanbul 2026.jpg' },
}
