import { Dispatch, SetStateAction } from 'react'
import { APP_SETTINGS_KEYS } from '../../../settings'
import { Row, Section, Choice } from '../settingsPrimitives'

type PrayerSectionProps = {
  calc: string
  setCalc: Dispatch<SetStateAction<string>>
  asr: string
  setAsr: Dispatch<SetStateAction<string>>
  timeFormat: string
  setTimeFormat: Dispatch<SetStateAction<string>>
  save: (key: string, value: string) => void
}

export function PrayerSection({
  calc, setCalc, asr, setAsr, timeFormat, setTimeFormat,
  save,
}: PrayerSectionProps) {
  return (
    <Section title="الصلاة">
      <Row title="طريقة حساب مواقيت الصلاة" stacked>
        <Choice current={calc} onChange={(v) => { setCalc(v); save(APP_SETTINGS_KEYS.prayerCalcMethod, v) }} labels={{
          '3': 'رابطة العالم الإسلامي', '4': 'أم القرى مكة', '5': 'الهيئة المصرية العامة للمساحة',
          '1': 'جامعة العلوم الإسلامية بكراتشي', '2': 'ISNA',
        }} />
      </Row>
      <Row title="طريقة حساب العصر" stacked>
        <Choice current={asr} onChange={(v) => { setAsr(v); save(APP_SETTINGS_KEYS.asrSchool, v) }}
          labels={{ '0': 'شافعي / جمهور', '1': 'حنفي' }} />
      </Row>
      <Row title="تنسيق الوقت" description="اختر عرض مواقيت الصلاة بنظام 24 ساعة أو 12 ساعة" stacked>
        <Choice current={timeFormat} onChange={(v) => { setTimeFormat(v); save(APP_SETTINGS_KEYS.timeFormat, v) }}
          labels={{ '24': '٢٤ ساعة', '12': '١٢ ساعة' }} />
      </Row>
      <Row title="إعدادات الإشعارات" description="يمكنك التحكم في تذكير الصلاة والتذكير قبلها من خانة الإشعارات في الإعدادات." last>
        <span className="text-[10px] text-azkar-ink-soft">منفصلة عن مواقيت الصلاة</span>
      </Row>
    </Section>
  )
}
