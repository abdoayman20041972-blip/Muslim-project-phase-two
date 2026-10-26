import type { Dispatch, SetStateAction } from 'react'
import { getTasbihWords, normalizeTasbihText, toArabicNumber, todayKey } from '../../../constants'
import { Toggle } from '../../../components/app-chrome'
import { useConfirmDialog } from '../../../components/confirm-dialog'
import { APP_SETTINGS_KEYS, emitSettingsChanged } from '../../../settings'
import { addCustomTasbih, deleteCustomTasbih, updateCustomTasbih } from '../../tasbih/customTasbih'
import { useCustomTasbihDialog } from '../../tasbih/custom-tasbih-dialog'
import { Row, Section } from '../settingsPrimitives'

type TasbihSectionProps = {
  tasbihSound: boolean
  setTasbihSound: Dispatch<SetStateAction<boolean>>
  vibration: boolean
  setVibration: Dispatch<SetStateAction<boolean>>
  custom: string
  setCustom: Dispatch<SetStateAction<string>>
  customGoal: string
  setCustomGoal: Dispatch<SetStateAction<string>>
  toggle: (key: string, setter: (value: boolean) => void, value: boolean) => void
}

export function TasbihSection({
  tasbihSound,
  setTasbihSound,
  vibration,
  setVibration,
  custom,
  setCustom,
  customGoal,
  setCustomGoal,
  toggle,
}: TasbihSectionProps) {
  const { confirm, alert } = useConfirmDialog()
  const { dialog: customTasbihDialog, open: openCustomTasbihDialog } = useCustomTasbihDialog()

  const customWords = getTasbihWords().filter((x) => x.id.startsWith('custom-'))

  const editCustomTasbih = async (id: string) => {
    const current = getTasbihWords().find((x) => x.id === id)
    if (!current) return
    const result = await openCustomTasbihDialog(current)
    if (!result) return
    try {
      updateCustomTasbih(id, result)
      emitSettingsChanged()
    } catch {}
  }

  return (
  <>
    <Section title="السبحة">
      <Section title="تجربة العد">
        <Row
          title="صوت التسبيح"
          description="تشغيل صوت خفيف مع كل ضغطة، ويُستخدم أيضًا كتنبيه عند اكتمال الجولة."
        >
          <Toggle
            checked={tasbihSound}
            onChange={() => toggle(APP_SETTINGS_KEYS.tasbihSound, setTasbihSound, tasbihSound)}
            label="صوت التسبيح"
          />
        </Row>
        <Row
          title="الاهتزاز"
          description="اهتزاز خفيف مع كل تسبيحة للمساعدة على العد دون النظر للشاشة."
          last
        >
          <Toggle
            checked={vibration}
            onChange={() => toggle(APP_SETTINGS_KEYS.vibration, setVibration, vibration)}
            label="الاهتزاز"
          />
        </Row>
      </Section>
      <Section title="بيانات السبحة">
        <Row title="إدارة العدّ" description="التصفير وإدارة سجل السبحة من الإعدادات فقط." stacked>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className="rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-[10px] font-bold text-azkar-ink-soft"
              onClick={async () => {
                const selected = localStorage.getItem('azkar_tasbih_selected_word')
                if (!selected) {
                  await alert({ message: 'اختر الذكر أولًا من شاشة السبحة.' })
                  return
                }
                if (!(await confirm({ message: 'تصفير الجولة الحالية لهذا الذكر؟' }))) return
                try {
                  const raw = JSON.parse(localStorage.getItem('azkar_tasbih_round_counts') || '{}')
                  if (raw && typeof raw === 'object' && !Array.isArray(raw)) raw[selected] = 0
                  localStorage.setItem('azkar_tasbih_round_counts', JSON.stringify(raw))
                  window.dispatchEvent(new Event('azkar-tasbih-changed'))
                } catch {}
              }}
            >
              تصفير الجولة
            </button>
            <button
              type="button"
              className="rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-[10px] font-bold text-azkar-ink-soft"
              onClick={async () => {
                if (!(await confirm({ message: 'تصفير إجمالي تسبيح اليوم؟', danger: true }))) return
                localStorage.setItem('azkar_day_total', '0')
                localStorage.setItem('azkar_day_total_date', todayKey())
                window.dispatchEvent(new Event('azkar-tasbih-changed'))
              }}
            >
              تصفير اليوم
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700"
              onClick={async () => {
                if (!(await confirm({ message: 'مسح كل بيانات السبحة؟ سيشمل العدّ اليومي، الجولات، السجل والذكر المحدد.', danger: true }))) return
                ;[
                  'azkar_counts',
                  'azkar_day_total',
                  'azkar_day_total_date',
                  'azkar_tasbih_selected_word',
                  'azkar_tasbih_rounds',
                  'azkar_tasbih_round_counts',
                  'azkar_tasbih_daily_history',
                ].forEach((key) => localStorage.removeItem(key))
                window.dispatchEvent(new Event('azkar-tasbih-changed'))
              }}
            >
              مسح البيانات
            </button>
          </div>
        </Row>
      </Section>
      <Row
        title="العبارات المخصصة"
        description="أضف أذكارك الخاصة وحدد هدفًا من 1 إلى 10000. يمكنك تعديلها أو حذفها لاحقًا."
        stacked
        last
      >
        <div className="space-y-2.5">
          {customWords.length === 0 && (
            <div className="rounded-2xl border border-dashed border-azkar-gold-soft bg-azkar-bg-alt px-3 py-3 text-center text-[11px] text-azkar-ink-faint">
              لا توجد عبارات مخصصة حاليًا.
            </div>
          )}
          {customWords.map((x) => (
            <div key={x.id} className="rounded-2xl border border-azkar-gold-soft bg-azkar-bg-alt p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-amiri text-sm font-bold text-azkar-teal-ink">{x.word}</div>
                  <div className="mt-0.5 text-[10px] text-azkar-ink-faint">الهدف: {toArabicNumber(x.goal)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => editCustomTasbih(x.id)}
                  className="rounded-xl border border-azkar-gold-soft bg-azkar-card px-2.5 py-1.5 text-[10px] font-bold text-azkar-teal-ink"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await confirm({ message: `حذف الذكر «${x.word}»؟`, danger: true }))) return
                    try {
                      deleteCustomTasbih(x.id)
                      emitSettingsChanged()
                    } catch {}
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-azkar-gold-soft bg-azkar-card p-3">
            <div className="mb-2 text-[10px] font-bold text-azkar-ink-soft">إضافة ذكر جديد</div>
            <div className="flex gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="مثال: الصلاة على النبي"
                className="min-w-0 flex-1 rounded-xl border border-azkar-hairline bg-azkar-bg-alt px-3 py-2 text-sm outline-none focus:border-azkar-teal"
              />
              <input
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                inputMode="numeric"
                type="number"
                min={1}
                max={10000}
                placeholder="الهدف"
                aria-label="هدف الذكر المخصص"
                className="w-20 rounded-xl border border-azkar-hairline bg-azkar-bg-alt px-2 py-2 text-center text-xs outline-none focus:border-azkar-teal"
              />
              <button
                type="button"
                onClick={async () => {
                  const v = custom.trim()
                  if (!v) {
                    await alert({ message: 'اكتب عبارة الذكر أولًا.' })
                    return
                  }
                  const goal = Number(customGoal)
                  if (!Number.isInteger(goal) || goal < 1 || goal > 10000) {
                    await alert({ message: 'أدخل هدفًا صحيحًا بين 1 و10000.' })
                    return
                  }
                  const norm = normalizeTasbihText(v)
                  const existing = getTasbihWords()
                  if (existing.some((x) => normalizeTasbihText(x.word) === norm)) {
                    await alert({ message: 'هذه العبارة موجودة بالفعل.' })
                    return
                  }
                  const list = existing.filter((x) => x.id.startsWith('custom-'))
                  if (list.length >= 10) {
                    await alert({ message: 'الحد الأقصى 10 عبارات مخصصة.' })
                    return
                  }
                  addCustomTasbih({ id: 'custom-' + Date.now().toString(36), word: v, goal })
                  setCustom('')
                  setCustomGoal('33')
                  emitSettingsChanged()
                }}
                className="rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      </Row>
    </Section>
    {customTasbihDialog}
  </>
  )
}
