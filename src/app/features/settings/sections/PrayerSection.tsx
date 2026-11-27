import { Dispatch, SetStateAction } from 'react'
import { APP_SETTINGS_KEYS } from '../../../settings'
import { Row, Section, Choice } from '../settingsPrimitives'
import { PrayerSourceCard } from '../../prayer/PrayerSourceCard'
import { useState } from 'react'
import { clampOffset, MAX_PRAYER_OFFSET, OFFSET_PRAYERS, PRAYER_LABELS, readPrayerOffsets } from '../../prayer/prayerTimes'
import type { PrayerOffsets } from '../../prayer/prayerTimes'
import { toArabicDigits } from '../../../constants'

const offsetSign = (n: number) => (n > 0 ? '+' : n < 0 ? '\u2212' : '')

function PrayerOffsets({ save }: { save: (key: string, value: string) => void }) {
  const [offsets, setOffsets] = useState<PrayerOffsets>(readPrayerOffsets)
  const change = (k: typeof OFFSET_PRAYERS[number], d: number) => {
    const next = { ...offsets, [k]: clampOffset(offsets[k] + d) }
    setOffsets(next)
    save(APP_SETTINGS_KEYS.prayerOffsets, JSON.stringify(next))
  }
  const btn = 'h-11 w-11 rounded-xl border border-azkar-line text-lg font-bold disabled:opacity-30'
  return (
    <Row title="تعديل يدوي لمواقيت الصلاة" description={`زِد أو انقص حتى ${toArabicDigits(String(MAX_PRAYER_OFFSET))} دقائق لكل صلاة. يُطبَّق على المواقيت والتنبيهات والعدّ التنازلي.`} stacked>
      <div className="grid w-full gap-2" data-testid="prayer-offsets">
        {OFFSET_PRAYERS.map((k) => (
          <div key={k} className="flex items-center justify-between gap-3" dir="rtl">
            <span className="text-sm font-semibold">{PRAYER_LABELS[k]}</span>
            <div className="flex items-center gap-2" dir="ltr">
              <button type="button" className={btn} aria-label={`إنقاص دقيقة من ${PRAYER_LABELS[k]}`} disabled={offsets[k] <= -MAX_PRAYER_OFFSET} onClick={() => change(k, -1)}>−</button>
              <span className="flex min-w-[3.5rem] items-center justify-center gap-1 text-sm font-bold" dir="rtl" aria-live="polite" data-testid={`offset-${k}`}><span>{offsetSign(offsets[k])}</span><span>{toArabicDigits(Math.abs(offsets[k]))}</span><span>د</span></span>
              <button type="button" className={btn} aria-label={`زيادة دقيقة إلى ${PRAYER_LABELS[k]}`} disabled={offsets[k] >= MAX_PRAYER_OFFSET} onClick={() => change(k, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </Row>
  )
}

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
      <PrayerSourceCard />
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
      <PrayerOffsets save={save} />
      <Row title="تنسيق الوقت" description="اختر عرض مواقيت الصلاة بنظام 24 ساعة أو 12 ساعة" stacked>
        <Choice current={timeFormat} onChange={(v) => { setTimeFormat(v); save(APP_SETTINGS_KEYS.timeFormat, v) }}
          labels={{ '24': '٢٤ ساعة', '12': '١٢ ساعة' }} />
      </Row>
      <Row title="إعدادات الإشعارات" description="يمكنك التحكم في تذكير الصلاة والتذكير قبلها من خانة الإشعارات في الإعدادات." last>
        <span className="text-[0.6875rem] text-azkar-ink-soft">منفصلة عن مواقيت الصلاة</span>
      </Row>
    </Section>
  )
}
