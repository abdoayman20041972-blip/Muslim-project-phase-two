import { formatLocalizedDate } from '../../../constants'
import { Row, Section } from '../settingsPrimitives'

type PrivacySectionProps = {
  hijri: boolean
  exportData: () => void
  importData: (file: File) => Promise<void>
  reset: () => void
}

export function PrivacySection({
  hijri,
  exportData,
  importData,
  reset,
}: PrivacySectionProps) {
  return (
    <>
      <Section title="التاريخ والمعلومات">
        <Row
          title="التاريخ الهجري اليوم"
          description={
            hijri
              ? formatLocalizedDate(
                  new Date(),
                  { dateStyle: 'full' },
                  'ar-SA-u-ca-islamic-umalqura',
                )
              : 'فعّل التقويم الهجري من قسم عام'
          }
          last
        >
          <span className="text-[0.625rem] font-bold">اليوم</span>
        </Row>
      </Section>
      <Section title="البيانات">
        <Row title="نسخة احتياطية" description="تشمل الإعدادات والتقدم والمفضلة وموضع القراءة، ولا تشمل الملفات الصوتية المنزلة" stacked>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportData}
              className="rounded-xl border px-3 py-2.5 text-[0.625rem] font-bold"
            >
              تصدير البيانات
            </button>
            <label className="rounded-xl bg-azkar-teal px-3 py-2.5 text-center text-[0.625rem] font-bold text-azkar-card">
              استيراد نسخة
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importData(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        </Row>
        <Row title="إعادة الإعدادات الافتراضية" last>
          <button onClick={reset} className="rounded-xl border px-3 py-2 text-[0.625rem]">
            إعادة الضبط
          </button>
        </Row>
      </Section>
    </>
  )
}
