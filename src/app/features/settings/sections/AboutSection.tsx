import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Row, Section } from '../settingsPrimitives'
import { PRAYER_PHOTOS } from '../../home/prayerPhotos'

/** The real installed version (versionName and versionCode) read from the Android package. */
function useInstalledVersion() {
  const native = Capacitor.isNativePlatform()
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    if (!native) return
    let alive = true
    App.getInfo()
      .then((info) => { if (alive) setLabel(`${info.version} (${info.build})`) })
      .catch(() => { if (alive) setLabel('') })
    return () => { alive = false }
  }, [native])
  return native ? `أندرويد${label ? ' ' + label : ''}` : 'Web / PWA'
}

type Seg = string | { t: string; u: string }
// Data sources shown in About. Wording reviewed by the user's assistant; the Tanzil line only repeats
// what alquran.cloud states on its credits page (https://alquran.cloud/credits).
export const DATA_SOURCES: Seg[][] = [
  ['نص المصحف: واجهة ', { t: 'alquran.cloud', u: 'https://alquran.cloud/credits' }, ' (النص العثماني)، وهي تأخذ نصوصها من مصادر منها مشروع تنزيل ', { t: 'tanzil.net', u: 'https://tanzil.net' }],
  ['التفسير الميسّر: مجمع الملك فهد لطباعة المصحف الشريف، عبر ', { t: 'alquran.cloud', u: 'https://alquran.cloud/credits' }],
  ['الأحاديث: مشروع hadith-api (', { t: 'fawazahmed0', u: 'https://github.com/fawazahmed0/hadith-api' }, ') وموقع ', { t: 'sunnah.com', u: 'https://sunnah.com' }, ' للروابط'],
  ['الأذكار: حصن المسلم (', { t: 'hisnmuslim.com', u: 'https://hisnmuslim.com' }, ')'],
  ['التلاوات والإذاعة: ', { t: 'mp3quran.net', u: 'https://mp3quran.net' }, ' و ', { t: 'qurango.net', u: 'https://qurango.net' }, ' و ', { t: 'islamic.network', u: 'https://islamic.network' }],
]

export function AboutSection() {
  const version = useInstalledVersion()
  return (
<Section title="حول مسلم">
  <Row title="اسم التطبيق">
    <b className="font-cairo text-azkar-teal-ink">مسلم</b>
  </Row>
  <Row title="الإصدار">
    <span className="text-[0.8125rem]">{version}</span>
  </Row>
  <Row title="صور بطاقة الصلاة" stacked>
    <ul dir="ltr" className="space-y-1 text-left text-[0.8125rem]" data-testid="photo-credits">
      {Object.values(PRAYER_PHOTOS).map((photo) => (
        <li key={photo.sourceUrl}>
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.artist}</a>
          {' / Wikimedia Commons / '}
          <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a>
        </li>
      ))}
    </ul>
  </Row>
  <Row title="مصادر البيانات" stacked>
    <ul className="space-y-1 text-[0.8125rem]" data-testid="data-sources">
      {DATA_SOURCES.map((line, i) => (
        <li key={i}>
          {line.map((seg, j) =>
            typeof seg === 'string' ? (
              <span key={j}>{seg}</span>
            ) : (
              <a key={j} dir="ltr" href={seg.u} target="_blank" rel="noopener noreferrer" className="underline">{seg.t}</a>
            ),
          )}
        </li>
      ))}
    </ul>
  </Row>
  <Row title="التواصل والملاحظات" last>
    <a
      href="mailto:feedback@muslim.app?subject=ملاحظات تطبيق مسلم"
      className="rounded-xl border px-3 py-2 text-[0.8125rem] font-bold"
    >
      إرسال ملاحظات
    </a>
  </Row>
</Section>
  )
}
