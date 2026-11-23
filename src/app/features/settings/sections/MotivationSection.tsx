import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { formatLocalizedDate, toArabicDigits, toArabicNumber } from '../../../constants'
import { APP_SETTINGS_KEYS } from '../../../settings'
import { AzkarStreakStats, TasbihStats } from '../settingsStats'
import { Row, Section } from '../settingsPrimitives'
import {
  KHATMA_TOTAL_PAGES,
  clampKhatmaDailyTarget,
  clampKhatmaPage,
  estimateKhatma,
} from '../khatma'

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
  // Only clamped values are ever persisted; while the user is typing an
  // unfinished value the box shows the raw text and nothing is saved.
  const page = clampKhatmaPage(khatmahPage) ?? 0
  const dailyTarget = clampKhatmaDailyTarget(khatmahTarget)
  const estimate = useMemo(
    () => (dailyTarget === null ? null : estimateKhatma(page, dailyTarget)),
    [page, dailyTarget],
  )

  // Older versions could store out-of-range or non-numeric values; normalize
  // them once on mount so the stored state becomes valid again (س17).
  useEffect(() => {
    const storedPage = clampKhatmaPage(khatmahPage)
    if (storedPage !== null && String(storedPage) !== khatmahPage) {
      setKhatmahPage(String(storedPage))
      save(APP_SETTINGS_KEYS.khatmahPage, String(storedPage))
    }
    const storedTarget = clampKhatmaDailyTarget(khatmahTarget)
    if (storedTarget !== null && String(storedTarget) !== khatmahTarget) {
      setKhatmahTarget(String(storedTarget))
      save(APP_SETTINGS_KEYS.khatmahTarget, String(storedTarget))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rawPage = khatmahPage.trim() === '' ? null : Number(khatmahPage)
  const rawTarget = khatmahTarget.trim() === '' ? null : Number(khatmahTarget)
  const pageOutOfRange = rawPage !== null && Number.isFinite(rawPage) && (rawPage < 0 || rawPage > KHATMA_TOTAL_PAGES)
  const targetOutOfRange = rawTarget !== null && Number.isFinite(rawTarget) && (rawTarget < 1 || rawTarget > KHATMA_TOTAL_PAGES)

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
                  max={KHATMA_TOTAL_PAGES}
                  value={khatmahPage}
                  onChange={(e) => {
                    setKhatmahPage(e.target.value)
                    const value = clampKhatmaPage(e.target.value)
                    if (value !== null) save(APP_SETTINGS_KEYS.khatmahPage, String(value))
                  }}
                  onBlur={() => {
                    const value = clampKhatmaPage(khatmahPage)
                    if (value !== null && String(value) !== khatmahPage) setKhatmahPage(String(value))
                  }}
                  aria-invalid={pageOutOfRange}
                  className="min-w-0 flex-1 rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-center text-sm"
                />
                <span className="text-[10px] text-azkar-ink-soft">من {toArabicDigits(String(KHATMA_TOTAL_PAGES))}</span>
              </div>
              {pageOutOfRange && (
                <p role="alert" className="mt-1 text-[10px] text-red-700 dark:text-red-300">
                  القيمة خارج النطاق، سيتم حفظ أقرب قيمة من ٠ إلى {toArabicDigits(String(KHATMA_TOTAL_PAGES))}.
                </p>
              )}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-azkar-bg-alt">
                <div
                  className="h-full rounded-full bg-azkar-gold transition-all"
                  style={{ width: (page / KHATMA_TOTAL_PAGES) * 100 + '%' }}
                />
              </div>
              <div className="mt-1 text-[10px] text-azkar-ink-soft">
                {toArabicNumber(Math.round((page / KHATMA_TOTAL_PAGES) * 100))}٪
                مكتمل
              </div>
            </Row>
            <Row
              title="هدف الختمة اليومي"
              description="كم صفحة تخطط لقراءتها كل يوم، ليحسب لك التطبيق موعد إتمام الختمة"
              stacked
              last
            >
              <div className="flex items-center gap-2">
                <input
                  aria-label="هدف الختمة اليومي"
                  type="number"
                  min="1"
                  max={KHATMA_TOTAL_PAGES}
                  value={khatmahTarget}
                  onChange={(e) => {
                    setKhatmahTarget(e.target.value)
                    const value = clampKhatmaDailyTarget(e.target.value)
                    if (value !== null) save(APP_SETTINGS_KEYS.khatmahTarget, String(value))
                  }}
                  onBlur={() => {
                    const value = clampKhatmaDailyTarget(khatmahTarget)
                    if (value !== null && String(value) !== khatmahTarget) setKhatmahTarget(String(value))
                  }}
                  aria-invalid={targetOutOfRange}
                  className="w-24 rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-center text-sm"
                />
                <span className="text-[10px] text-azkar-ink-soft">صفحات يوميًا</span>
              </div>
              {targetOutOfRange && (
                <p role="alert" className="mt-1 text-[10px] text-red-700 dark:text-red-300">
                  القيمة خارج النطاق، سيتم حفظ أقرب قيمة من ١ إلى {toArabicDigits(String(KHATMA_TOTAL_PAGES))}.
                </p>
              )}
              {estimate && (
                <p className="mt-2 rounded-xl bg-azkar-bg-alt px-3 py-2 text-[11px] leading-6 text-azkar-ink" data-testid="khatma-estimate">
                  {estimate.remaining === 0 ? (
                    <>أتممت المصحف كاملًا، تقبّل الله منك.</>
                  ) : (
                    <>
                      المتبقي {toArabicNumber(estimate.remaining)} صفحة.
                      بمعدل {toArabicNumber(dailyTarget!)} صفحات يوميًا تُتم الختمة خلال {toArabicNumber(estimate.days)}{' '}
                      {estimate.days === 1 ? 'يوم' : estimate.days === 2 ? 'يومين' : estimate.days <= 10 ? 'أيام' : 'يومًا'}
                      {estimate.finishDate && (
                        <>
                          {' '}— حوالي{' '}
                          {formatLocalizedDate(estimate.finishDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </>
                      )}
                      .
                    </>
                  )}
                </p>
              )}
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
