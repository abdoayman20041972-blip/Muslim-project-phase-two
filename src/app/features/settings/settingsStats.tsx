import { useEffect, useState } from 'react'
import { getTasbihWords, numLocale, todayKey, toArabicDigits, toArabicNumber } from '../../constants'
import { readAzkarProgressDays } from '../azkar/azkarProgress'

export function AzkarStreakStats() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const refresh = () => setTick((x) => x + 1)
    window.addEventListener('azkar-progress-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('azkar-progress-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  void tick
  const days = (() => {
    try {
      return readAzkarProgressDays()
    } catch {
      return {}
    }
  })()
  const activeDates = Object.entries(days)
    .filter(([, items]) => Object.values(items || {}).some((v) => Number(v) > 0))
    .map(([date]) => date)
    .sort()
  const activeSet = new Set(activeDates)
  const dayBefore = (date: string) => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA')
  }
  const today = new Date().toLocaleDateString('en-CA')
  let current = 0
  if (activeSet.has(today)) {
    current = 1
    let cursor = today
    while (activeSet.has(dayBefore(cursor))) {
      current++
      cursor = dayBefore(cursor)
    }
  }
  let best = 0
  for (const date of activeDates) {
    let run = 1
    let cursor = date
    while (activeSet.has(dayBefore(cursor))) {
      run++
      cursor = dayBefore(cursor)
    }
    best = Math.max(best, run)
  }
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-azkar-teal-tint p-3 text-center">
          <div className="text-[10px]">سلسلة الأذكار الحالية</div>
          <b className="text-lg text-azkar-teal-ink">{toArabicNumber(current)} يوم</b>
        </div>
        <div className="rounded-xl bg-azkar-bg-alt p-3 text-center">
          <div className="text-[10px]">أفضل سلسلة أذكار</div>
          <b className="text-lg text-azkar-teal-ink">{toArabicNumber(best)} يوم</b>
        </div>
      </div>
      <div className="mt-3 text-[9px] text-azkar-ink-faint">
        السلسلة تعتمد على الأيام التي سُجّل فيها ذكر واحد على الأقل.
      </div>
    </div>
  )
}
export function TasbihStats() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const refresh = () => setTick((x) => x + 1)
    window.addEventListener('storage', refresh)
    window.addEventListener('azkar-tasbih-changed', refresh)
    window.addEventListener('azkar-settings-changed', refresh)
    const onFocus = () => setTick((x) => x + 1)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('azkar-tasbih-changed', refresh)
      window.removeEventListener('azkar-settings-changed', refresh)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  void tick
  const readRecord = (key: string) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '{}')
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number>) : {}
    } catch {
      return {}
    }
  }
  const counts = readRecord('azkar_counts'),
    rounds = readRecord('azkar_tasbih_rounds'),
    total = Object.values(counts).reduce((a, v) => a + (Number(v) || 0), 0)
  const history = readRecord('azkar_tasbih_daily_history'),
    today = todayKey(),
    todayValue = Number(history[today] || 0)
  const words = getTasbihWords(),
    chartDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = todayKey(d)
      return {
        key,
        label: d.toLocaleDateString(numLocale('ar-EG'), { weekday: 'short' }),
        value: i === 6 ? todayValue : Number(history[key] || 0),
      }
    }),
    chartMax = Math.max(1, ...chartDays.map((x) => x.value))
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-azkar-teal-tint p-3 text-center">
          <div className="text-[10px]">إجمالي التسبيح</div>
          <b className="text-lg text-azkar-teal-ink">{toArabicNumber(total)}</b>
        </div>
        <div className="rounded-xl bg-azkar-bg-alt p-3 text-center">
          <div className="text-[10px]">تسبيح اليوم</div>
          <b className="text-lg text-azkar-teal-ink">{toArabicNumber(todayValue)}</b>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {words.map((x) => (
          <div key={x.id} className="flex justify-between text-[10px]">
            <span>{x.word}</span>
            <b>
              {toArabicNumber(Number(counts[x.id] || 0))} —{' '}
              {toArabicNumber(Number(rounds[x.id] || 0))} جولة
            </b>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[10px] font-bold">آخر {toArabicDigits('7')} أيام</div>
        <div
          className="grid grid-cols-7 items-end gap-2"
          aria-label="رسم بياني لتسبيح آخر سبعة أيام"
        >
          {chartDays.map((d, i) => (
            <div key={d.key} className="flex min-w-0 flex-col items-center gap-1">
              <span className="text-[8px]">{toArabicNumber(d.value)}</span>
              <div className="flex h-16 w-full max-w-7 items-end rounded-full bg-azkar-bg-alt">
                <div
                  className={`w-full rounded-full ${i === 6 ? 'bg-azkar-teal' : 'bg-azkar-gold'}`}
                  style={{ height: `${Math.max(6, (d.value / chartMax) * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-[8px] ${i === 6 ? 'font-bold text-azkar-teal-ink' : 'text-azkar-ink-faint'}`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
        <p className="sr-only">
          الرسم البياني لآخر سبعة أيام: {chartDays.map((d) => d.label + ' ' + d.value).join('، ')}.
        </p>
      </div>
    </div>
  )
}
