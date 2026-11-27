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
