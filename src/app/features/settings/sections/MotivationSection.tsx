import type { Dispatch, SetStateAction } from 'react'
import { toArabicDigits, toArabicNumber } from '../../../constants'
import { APP_SETTINGS_KEYS } from '../../../settings'
import { AzkarStreakStats, TasbihStats } from '../settingsStats'
import { Row, Section } from '../settingsPrimitives'

type MotivationSectionProps = {
  khatmahPage: string
  setKhatmahPage: Dispatch<SetStateAction<string>>
  khatmahTarget: string
  setKhatmahTarget: Dispatch<SetStateAction<string>>
  save: (key: string, value: string) => void
}

export function MotivationSection({
  khatmahPage,
  setKhatmahPage,
  khatmahTarget,
  setKhatmahTarget,
  save,
}: MotivationSectionProps) {
  return (
        <>
          <Section title="الختمة">
            <Row
              title="تقدم الختمة"
              description="سجّل رقم الصفحة التي وصلت إليها في المصحف"
              stacked
            >
              <div className="flex items-center gap-2">
                <input
                  aria-label="صفحة الختمة"
                  type="number"
                  min="0"
                  max="604"
                  value={khatmahPage}
                  onChange={(e) => {
                    setKhatmahPage(e.target.value)
                    save(APP_SETTINGS_KEYS.khatmahPage, e.target.value)
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-center text-sm"
                />
                <span className="text-[10px] text-azkar-ink-soft">من {toArabicDigits('604')}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-azkar-bg-alt">
                <div
                  className="h-full rounded-full bg-azkar-gold transition-all"
                  style={{ width: Math.min((Number(khatmahPage || 0) / 604) * 100, 100) + '%' }}
                />
              </div>
              <div className="mt-1 text-[10px] text-azkar-ink-soft">
                {toArabicNumber(Math.min(Math.round((Number(khatmahPage || 0) / 604) * 100), 100))}٪
                مكتمل
              </div>
            </Row>
            <Row title="هدف الختمة" description="عدد الصفحات المستهدف لإكمال الختمة" last>
              <div className="flex items-center gap-2">
                <input
                  aria-label="هدف الختمة"
                  type="number"
                  min="1"
                  max="604"
                  value={khatmahTarget}
                  onChange={(e) => {
                    setKhatmahTarget(e.target.value)
                    save(APP_SETTINGS_KEYS.khatmahTarget, e.target.value)
                  }}
                  className="w-24 rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-center text-sm"
                />
                <span className="text-[10px] text-azkar-ink-soft">صفحة</span>
              </div>
            </Row>
          </Section>
          <Section title="سلسلة الأذكار">
            <AzkarStreakStats />
          </Section>
          <Section title="إحصائيات السبحة">
            <TasbihStats />
          </Section>
        </>
  )
}
