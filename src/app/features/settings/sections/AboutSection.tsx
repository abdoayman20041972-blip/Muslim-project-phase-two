import { Capacitor } from '@capacitor/core'
import { Row, Section } from '../settingsPrimitives'

export function AboutSection() {
  return (
<Section title="حول مسلم">
  <Row title="اسم التطبيق">
    <b className="font-amiri text-azkar-teal-ink">مسلم</b>
  </Row>
  <Row title="الإصدار">
    <span className="text-[10px]">{Capacitor.isNativePlatform() ? 'أندرويد 1.1.0' : 'Web / PWA'}</span>
  </Row>
  <Row title="التواصل والملاحظات" last>
    <a
      href="mailto:feedback@muslim.app?subject=ملاحظات تطبيق مسلم"
      className="rounded-xl border px-3 py-2 text-[10px] font-bold"
    >
      إرسال ملاحظات
    </a>
  </Row>
</Section>
  )
}
