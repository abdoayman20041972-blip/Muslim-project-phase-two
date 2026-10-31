import { useEffect, useMemo, useState } from 'react'
import { FONT_ORDER, FONT_SIZES, type FontSizeKey, toArabicNumber } from '../../../constants'
import { QURAN_AUDIO_RECITERS, QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from '../../quran/quranAudioPlayback'
import {
  deleteReciterAll,
  deleteSurah,
  downloadReciterAll,
  downloadSurah,
  getDownloadStatus,
  type OfflineDownloadState,
} from '../../quran/offlineDownload'
import { surahList } from '../../../../quran-meta'
import { APP_SETTINGS_KEYS } from '../../../settings'
import { Row, Section, Choice } from '../settingsPrimitives'

const RECITER_SIZES: Record<QuranAudioReciter, string> = {
  'ar.minshawi': '~2.04 GB',
  'ar.alafasy': '~1.96 GB',
  'ar.husary': '~2.99 GB',
  'ar.abdulbasitmurattal': '~0.58 GB',
  'ar.abdurrahmaansudais': '~1.46 GB',
  'ar.mahermuaiqly': '~0.78 GB',
  'ar.hudhaify': '~1.05 GB',
  'ar.saoodshuraym': '~1.30 GB',
  'ar.ahmedajamy': '~2.10 GB',
  'ar.shaatree': '~1.77 GB',
}

type QuranSectionProps = {
  fontSize: FontSizeKey
  setFontSize: (value: FontSizeKey) => void
  reciter: string
  setReciter: (value: string) => void
  layout: 'scroll' | 'pages'
  setLayout: (value: 'scroll' | 'pages') => void
  tafsir: string
  setTafsir: React.Dispatch<React.SetStateAction<string>>
  save: (key: string, value: string) => void
}

type ReciterStatus = { completed: number[]; total: number }
type ActiveJob = { kind: 'surah'; surahNumber: number } | { kind: 'reciter' }

function DownloadStatus({ state, active }: { state: OfflineDownloadState; active: boolean }) {
  if (active || state === 'downloading') return <span className="text-azkar-gold">جاري التنزيل…</span>
  if (state === 'completed') return <span className="text-azkar-teal">منزّلة</span>
  return <span className="text-azkar-ink-faint">غير منزّلة</span>
}

export function QuranSection({
  fontSize, setFontSize, reciter, setReciter, layout, setLayout, tafsir, setTafsir, save,
}: QuranSectionProps) {
  const [statuses, setStatuses] = useState<Partial<Record<QuranAudioReciter, ReciterStatus>>>({})
  const [openReciter, setOpenReciter] = useState<QuranAudioReciter | null>(null)
  const [activeJobs, setActiveJobs] = useState<Partial<Record<QuranAudioReciter, ActiveJob>>>({})
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = async (id: QuranAudioReciter) => {
    const status = await getDownloadStatus(id)
    setStatuses((current) => ({ ...current, [id]: status }))
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all(QURAN_AUDIO_RECITERS.map(async (id) => {
      try {
        const status = await getDownloadStatus(id)
        if (!cancelled) setStatuses((current) => ({ ...current, [id]: status }))
      } catch {
        // Offline storage may be unavailable in restricted test/private contexts; keep the settings screen usable.
      }
    }))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const activeIds = QURAN_AUDIO_RECITERS.filter((id) => activeJobs[id])
    if (!activeIds.length) return
    const timer = window.setInterval(() => {
      void Promise.all(activeIds.map(refreshStatus))
    }, 400)
    return () => window.clearInterval(timer)
  }, [activeJobs])

  const runDownload = async (id: QuranAudioReciter, job: ActiveJob, action: () => Promise<void>) => {
    setError(null)
    setActiveJobs((current) => ({ ...current, [id]: job }))
    try {
      await action()
      await refreshStatus(id)
    } catch {
      await refreshStatus(id).catch((error) => console.debug('[QuranSection]', error))
      setError('تعذر إكمال التنزيل. يمكنك المحاولة مرة أخرى.')
    } finally {
      setActiveJobs((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
    }
  }

  const getState = (id: QuranAudioReciter, surahNumber?: number): OfflineDownloadState => {
    const active = activeJobs[id]
    if (active && (active.kind === 'reciter' || active.surahNumber === surahNumber)) return 'downloading'
    if (surahNumber !== undefined && statuses[id]?.completed.includes(surahNumber)) return 'completed'
    if (surahNumber === undefined && statuses[id]?.completed.length === 114) return 'completed'
    return 'not-started'
  }

  const completedCount = (id: QuranAudioReciter) => statuses[id]?.completed.length ?? 0
  const isFull = (id: QuranAudioReciter) => completedCount(id) === 114
  const isPartial = (id: QuranAudioReciter) => completedCount(id) > 0 && !isFull(id)

  const reciterCards = useMemo(() => QURAN_AUDIO_RECITERS, [])

  return (
    <>
      <Section title="المصحف">
        <Row title="حجم الخط" description={FONT_SIZES[fontSize].label}>
          <div className="flex gap-1">
            <button aria-label="تصغير الخط" onClick={() => setFontSize(FONT_ORDER[Math.max(0, FONT_ORDER.indexOf(fontSize) - 1)])} className="h-9 w-9 rounded-full border">−</button>
            <button aria-label="تكبير الخط" onClick={() => setFontSize(FONT_ORDER[Math.min(FONT_ORDER.length - 1, FONT_ORDER.indexOf(fontSize) + 1)])} className="h-9 w-9 rounded-full border">+</button>
          </div>
        </Row>
        <Row title="القارئ" description="يُستخدم في التلاوة الصوتية">
          <select aria-label="قارئ المصحف" value={reciter} onChange={(e) => setReciter(e.target.value)} className="max-w-[10rem] rounded-xl border px-2 py-2 text-[10px]">
            {QURAN_AUDIO_RECITERS.map((id) => <option key={id} value={id}>{QURAN_AUDIO_RECITER_LABELS[id]}</option>)}
          </select>
        </Row>
        <Row title="طريقة عرض الآيات" description={layout === 'scroll' ? 'تمرير متصل' : 'صفحات من 10 آيات'} last stacked>
          <Choice current={layout} onChange={(v) => setLayout(v as 'scroll' | 'pages')} labels={{ scroll: 'تمرير', pages: 'صفحات' }} />
        </Row>
      </Section>

      <Section title="تنزيل للاستماع بدون إنترنت">
        <div className="space-y-3 p-3">
          <p className="text-[10px] leading-5 text-azkar-ink-soft">
            نزّل سورة واحدة أو مكتبة القارئ كاملة للاستماع لاحقًا دون اتصال. الحجم المعروض تقديري حسب بيانات فحص المصادر.
          </p>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</div>}
          {reciterCards.map((id) => {
            const count = completedCount(id)
            const full = isFull(id)
            const partial = isPartial(id)
            const active = Boolean(activeJobs[id])
            return (
              <div key={id} className="rounded-2xl border border-azkar-gold-soft bg-azkar-card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-amiri font-bold text-base text-azkar-teal-ink">{QURAN_AUDIO_RECITER_LABELS[id]}</div>
                    <div className="mt-0.5 text-[10px] text-azkar-ink-soft">{toArabicNumber(114)} سورة · {RECITER_SIZES[id]}</div>
                    {active || count > 0 ? (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-[9px] text-azkar-ink-soft">
                          <span>{active ? 'جاري التنزيل' : full ? 'مكتمل' : 'تنزيل جزئي'}</span>
                          <span>{toArabicNumber(count)} / {toArabicNumber(114)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-azkar-teal-tint">
                          <div className="h-full rounded-full bg-azkar-teal transition-all" style={{ width: `${Math.round((count / 114) * 100)}%` }} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => full ? void runDownload(id, { kind: 'reciter' }, () => deleteReciterAll(id)) : void runDownload(id, { kind: 'reciter' }, () => downloadReciterAll(id))}
                    className="shrink-0 rounded-xl border px-2.5 py-2 text-[10px] disabled:opacity-50"
                  >
                    {active ? 'جاري…' : full ? 'حذف القارئ كاملًا' : partial ? 'استكمال' : 'تنزيل القارئ كاملًا'}
                  </button>
                </div>

                <button type="button" onClick={() => setOpenReciter(openReciter === id ? null : id)} className="mt-3 text-[10px] text-azkar-teal-ink underline">
                  {openReciter === id ? 'إخفاء السور' : `عرض السور (${toArabicNumber(114)})`}
                </button>

                {openReciter === id && (
                  <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto border-t border-azkar-gold-soft pt-3">
                    {surahList.map((surah) => {
                      const state = getState(id, surah.number)
                      const busy = activeJobs[id]?.kind === 'surah' && activeJobs[id]?.surahNumber === surah.number
                      return (
                        <div key={surah.number} className="flex items-center gap-2 rounded-xl bg-azkar-card px-2.5 py-2">
                          <span className="min-w-0 flex-1 text-[11px]">
                            {toArabicNumber(surah.number)}. {surah.shortName}
                          </span>
                          <DownloadStatus state={state} active={busy} />
                          {state === 'completed' ? (
                            <button type="button" onClick={() => void runDownload(id, { kind: 'surah', surahNumber: surah.number }, () => deleteSurah(id, surah.number))} className="rounded-lg border px-2 py-1 text-[9px]">
                              حذف
                            </button>
                          ) : (
                            <button type="button" disabled={activeJobs[id] !== undefined} onClick={() => void runDownload(id, { kind: 'surah', surahNumber: surah.number }, () => downloadSurah(id, surah.number))} className="rounded-lg border px-2 py-1 text-[9px] disabled:opacity-50">
                              {busy ? 'جاري…' : 'تنزيل'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="التفسير">
        <Row title="مصدر التفسير" stacked last>
          <Choice current={tafsir} onChange={(v) => { setTafsir(v); save(APP_SETTINGS_KEYS.tafsirSource, v) }}
            labels={{ muyassar: 'التفسير الميسر', saddi: 'السعدي', ibnKathir: 'ابن كثير', tabari: 'الطبري' }} />
        </Row>
      </Section>
    </>
  )
}
