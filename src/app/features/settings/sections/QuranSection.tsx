import { useCallback, useEffect, useState } from 'react'
import { FONT_ORDER, FONT_SIZES, type FontSizeKey, toArabicNumber } from '../../../constants'
import { QURAN_AUDIO_RECITERS, QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from '../../quran/quranAudioPlayback'
import {
  cancelDownload,
  deleteReciterAll,
  deleteSurah,
  downloadReciterAll,
  downloadSurah,
  getDownloadStatus,
  getReciterStorageBytes,
  getStorageEstimate,
  getStoragePersistence,
  pauseDownload,
  resumeDownload,
  retryFailedDownloads,
  subscribeToDownloadJobs,
  type DownloadFailureReason,
  type DownloadJobSnapshot,
  type StatusSummary,
} from '../../quran/offlineDownload'
import { surahList } from '../../../../quran-meta'
import { APP_SETTINGS_KEYS, readSetting } from '../../../settings'
import { Toggle } from '../../../components/app-chrome'
import { ReciterPicker } from '../../quran/ReciterPicker'
import { Row, Section, Choice } from '../settingsPrimitives'

const RECITER_SIZE_ESTIMATES: Record<QuranAudioReciter, string> = {
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

const FAILURE_LABELS: Record<DownloadFailureReason, string> = {
  network: 'انقطع الاتصال',
  http: 'خطأ من الخادم',
  'invalid-content': 'الملف المستلم ليس صوتًا',
  truncated: 'الملف غير مكتمل',
  stalled: 'توقف الإرسال',
  storage: 'مشكلة في مساحة التخزين',
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

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${toArabicNumber(Number((bytes / 1_073_741_824).toFixed(2)))} ج.ب`
  if (bytes >= 1_048_576) return `${toArabicNumber(Number((bytes / 1_048_576).toFixed(1)))} م.ب`
  if (bytes >= 1024) return `${toArabicNumber(Math.round(bytes / 1024))} ك.ب`
  return `${toArabicNumber(bytes)} بايت`
}

function surahName(surahNumber: number): string {
  return surahList.find((surah) => surah.number === surahNumber)?.shortName ?? String(surahNumber)
}

function jobKey(job: DownloadJobSnapshot): string {
  return `${job.reciter}:${job.state}:${job.completedCount}:${job.failed.length}:${job.pendingCount}`
}

export function QuranSection({
  fontSize, setFontSize, reciter, setReciter, layout, setLayout, tafsir, setTafsir, save,
}: QuranSectionProps) {
  const [statuses, setStatuses] = useState<Partial<Record<QuranAudioReciter, StatusSummary>>>({})
  const [storageBytes, setStorageBytes] = useState<Partial<Record<QuranAudioReciter, number>>>({})
  const [jobs, setJobs] = useState<DownloadJobSnapshot[]>([])
  const [openReciter, setOpenReciter] = useState<QuranAudioReciter | null>(null)
  const [confirmReciter, setConfirmReciter] = useState<QuranAudioReciter | null>(null)
  const [freeSpace, setFreeSpace] = useState<number | undefined>(undefined)
  const [persistenceNote, setPersistenceNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshAll = useCallback(async () => {
    const nextStatuses: Partial<Record<QuranAudioReciter, StatusSummary>> = {}
    const nextBytes: Partial<Record<QuranAudioReciter, number>> = {}
    await Promise.all(QURAN_AUDIO_RECITERS.map(async (id) => {
      try {
        nextStatuses[id] = await getDownloadStatus(id)
        nextBytes[id] = await getReciterStorageBytes(id)
      } catch {
        // Offline storage may be unavailable in restricted/private contexts; keep the screen usable.
      }
    }))
    setStatuses(nextStatuses)
    setStorageBytes(nextBytes)
  }, [])

  useEffect(() => {
    void refreshAll()
    void getStorageEstimate().then(({ usage, quota }) => {
      if (quota !== undefined) setFreeSpace(Math.max(0, quota - (usage ?? 0)))
    })
    const persistence = getStoragePersistence()
    if (persistence.supported && persistence.granted === false) {
      setPersistenceNote('التخزين غير ثابت: قد يحذف المتصفح التنزيلات عند ضغط المساحة.')
    } else if (persistence.supported && persistence.granted === true) {
      setPersistenceNote('التخزين الثابت مفعّل: لن يحذف المتصفح التنزيلات تلقائيًا.')
    }
  }, [refreshAll])

  useEffect(() => subscribeToDownloadJobs(setJobs), [])

  const jobsVersion = jobs.map(jobKey).join('|')
  useEffect(() => {
    void refreshAll()
  }, [jobsVersion, refreshAll])

  const jobFor = (id: QuranAudioReciter) => jobs.find((job) => job.reciter === id)

  const startReciterDownload = (id: QuranAudioReciter) => {
    setError(null)
    setConfirmReciter(null)
    void downloadReciterAll(id).catch(() => setError('تعذر إكمال التنزيل. يمكنك المحاولة مرة أخرى.'))
  }

  const retryFailed = (id: QuranAudioReciter) => {
    setError(null)
    void retryFailedDownloads(id).catch(() => setError('تعذر إكمال التنزيل. يمكنك المحاولة مرة أخرى.'))
  }

  const startSurahDownload = (id: QuranAudioReciter, surahNumber: number) => {
    setError(null)
    void downloadSurah(id, surahNumber).catch(() => setError('تعذر إكمال التنزيل. يمكنك المحاولة مرة أخرى.'))
  }

  const [hideMini, setHideMini] = useState(() => readSetting(APP_SETTINGS_KEYS.hideMiniPlayer, '0') === '1')
  const totalStored = Object.values(storageBytes).reduce((sum, value) => sum + (value ?? 0), 0)

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
          <ReciterPicker label="قارئ المصحف" value={reciter} onChange={setReciter} className="h-10 w-[10rem]" />
        </Row>
        <Row title="إخفاء المشغّل العائم" description="يخفي المشغّل الصغير أعلى الشريط السفلي. التلاوة والإشعار يستمرّان">
          <Toggle checked={hideMini} onChange={() => { const n = !hideMini; setHideMini(n); save(APP_SETTINGS_KEYS.hideMiniPlayer, n ? '1' : '0') }} label="إخفاء المشغّل العائم" />
        </Row>
        <Row title="طريقة عرض الآيات" description={layout === 'scroll' ? 'تمرير متصل' : 'صفحات من 10 آيات'} last stacked>
          <Choice current={layout} onChange={(v) => setLayout(v as 'scroll' | 'pages')} labels={{ scroll: 'تمرير', pages: 'صفحات' }} />
        </Row>
      </Section>

      <Section title="مدير التنزيلات">
        <div className="space-y-3 p-3">
          <p className="text-xs leading-6 text-azkar-ink-soft">
            نزّل سورة واحدة أو مكتبة قارئ كاملة للاستماع لاحقًا دون اتصال. التنزيل يستمر حتى لو غادرت هذه الشاشة.
          </p>
          <p className="text-xs text-azkar-ink-soft">
            {totalStored > 0 ? `المساحة المستخدمة للتنزيلات: ${formatBytes(totalStored)}` : 'لا توجد تنزيلات محفوظة بعد.'}
            {freeSpace !== undefined ? ` · المتاح التقريبي: ${formatBytes(freeSpace)}` : ''}
          </p>
          {persistenceNote && <p className="text-xs text-azkar-ink-soft">{persistenceNote}</p>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

          {jobs.length > 0 && (
            <div className="space-y-2" aria-label="التنزيلات الجارية">
              {jobs.map((job) => {
                const currentName = job.current ? surahName(job.current.surahNumber) : null
                const percent = job.current?.totalBytes
                  ? Math.min(100, Math.round((job.current.receivedBytes / job.current.totalBytes) * 100))
                  : undefined
                return (
                  <div key={job.reciter} className="rounded-2xl border border-azkar-gold bg-azkar-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-azkar-teal-ink">
                          {job.state === 'paused' ? 'متوقف مؤقتًا' : 'يجري الآن'} · {QURAN_AUDIO_RECITER_LABELS[job.reciter]}
                        </div>
                        <div className="mt-1 text-xs text-azkar-ink-soft">
                          {currentName
                              ? `سورة ${currentName}${percent !== undefined ? ` · ${toArabicNumber(percent)}٪` : ''} · ${formatBytes(job.current?.receivedBytes ?? 0)}${job.current?.bytesPerSecond ? ` · ${formatBytes(Math.round(job.current.bytesPerSecond))}/ث` : ''}`
                              : 'جاري التحضير…'}
                        </div>
                        <div className="mt-1 text-xs text-azkar-ink-soft">
                          اكتمل {toArabicNumber(job.completedCount)} · متبقٍ {toArabicNumber(job.pendingCount)}
                          {job.failed.length > 0 ? ` · فشل ${toArabicNumber(job.failed.length)}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        {job.state === 'running' ? (
                          <button type="button" onClick={() => pauseDownload(job.reciter)} className="rounded-xl border px-3 py-2 text-xs">
                            إيقاف مؤقت
                          </button>
                        ) : (
                          <button type="button" onClick={() => void resumeDownload(job.reciter)} className="rounded-xl border px-3 py-2 text-xs">
                            استئناف
                          </button>
                        )}
                        <button type="button" onClick={() => cancelDownload(job.reciter)} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700">
                          إلغاء
                        </button>
                      </div>
                    </div>
                    {percent !== undefined && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-azkar-teal-tint">
                        <div className="h-full rounded-full bg-azkar-gold transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {QURAN_AUDIO_RECITERS.map((id) => {
            const status = statuses[id]
            const completed = status?.completed.length ?? 0
            const failed = status?.failed ?? []
            const full = completed === 114
            const partial = completed > 0 && !full
            const bytes = storageBytes[id] ?? 0
            const job = jobFor(id)
            return (
              <div key={id} className="rounded-2xl border border-azkar-gold-soft bg-azkar-card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-amiri text-lg font-bold text-azkar-teal-ink">{QURAN_AUDIO_RECITER_LABELS[id]}</div>
                    <div className="mt-0.5 text-xs text-azkar-ink-soft">
                      {toArabicNumber(114)} سورة · {bytes > 0 ? `المساحة الفعلية ${formatBytes(bytes)}` : `الحجم التقديري ${RECITER_SIZE_ESTIMATES[id]}`}
                    </div>
                    {(completed > 0 || failed.length > 0) && (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-xs text-azkar-ink-soft">
                          <span>{full ? 'مكتمل' : job ? 'جاري التنزيل' : 'تنزيل جزئي'}</span>
                          <span>{toArabicNumber(completed)} / {toArabicNumber(114)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-azkar-teal-tint">
                          <div className="h-full rounded-full bg-azkar-teal transition-all" style={{ width: `${Math.round((completed / 114) * 100)}%` }} />
                        </div>
                        {failed.length > 0 && (
                          <div className="mt-1 text-xs text-red-700">
                            فشل {toArabicNumber(failed.length)}: {failed.slice(0, 3).map((f) => `سورة ${surahName(f.surahNumber)} (${FAILURE_LABELS[f.reason]})`).join('، ')}{failed.length > 3 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {!job && !full && (
                      <button type="button" onClick={() => setConfirmReciter(id)} className="rounded-xl border px-3 py-2 text-xs">
                        {partial || failed.length > 0 ? 'استكمال التنزيل' : 'تنزيل القارئ كاملًا'}
                      </button>
                    )}
                    {!job && failed.length > 0 && (
                      <button type="button" onClick={() => retryFailed(id)} className="rounded-xl border px-3 py-2 text-xs">
                        إعادة الفاشل ({toArabicNumber(failed.length)})
                      </button>
                    )}
                    {!job && full && (
                      <button type="button" onClick={() => void deleteReciterAll(id).then(refreshAll)} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700">
                        حذف القارئ كاملًا
                      </button>
                    )}
                    {job && <span className="text-xs text-azkar-ink-soft">أدرها من الأعلى</span>}
                  </div>
                </div>

                {confirmReciter === id && !job && (
                  <div className="mt-3 rounded-xl border border-azkar-gold-soft bg-azkar-teal-tint p-3">
                    <p className="text-xs leading-6 text-azkar-ink-soft">
                      تنزيل المكتبة كاملة يستهلك حوالي {RECITER_SIZE_ESTIMATES[id]} من بيانات الهاتف والمساحة.
                      {freeSpace !== undefined ? ` المتاح التقريبي الآن: ${formatBytes(freeSpace)}.` : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => startReciterDownload(id)} className="rounded-xl bg-azkar-teal px-3 py-2 text-xs text-white">
                        بدء التنزيل
                      </button>
                      <button type="button" onClick={() => setConfirmReciter(null)} className="rounded-xl border px-3 py-2 text-xs">
                        تراجع
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => setOpenReciter(openReciter === id ? null : id)} className="mt-1 inline-flex min-h-10 items-center text-xs text-azkar-teal-ink underline">
                  {openReciter === id ? 'إخفاء السور' : `عرض السور (${toArabicNumber(114)})`}
                </button>

                {openReciter === id && (
                  <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto border-t border-azkar-gold-soft pt-3">
                    {surahList.map((surah) => {
                      const isCompleted = status?.completed.includes(surah.number) ?? false
                      const failedEntry = status?.failed.find((f) => f.surahNumber === surah.number)
                      const isCurrent = job?.current?.surahNumber === surah.number
                      return (
                        <div key={surah.number} className="flex items-center gap-2 rounded-xl bg-azkar-card px-3 py-2.5">
                          <span className="min-w-0 flex-1 text-sm">
                            {toArabicNumber(surah.number)}. {surah.shortName}
                          </span>
                          {isCurrent && job?.state === 'running' ? (
                            <span className="text-xs text-azkar-gold">جاري التنزيل…</span>
                          ) : isCompleted ? (
                            <span className="text-xs text-azkar-teal">منزّلة</span>
                          ) : failedEntry ? (
                            <span className="text-xs text-red-700">فشل: {FAILURE_LABELS[failedEntry.reason]}</span>
                          ) : (
                            <span className="text-xs text-azkar-ink-faint">غير منزّلة</span>
                          )}
                          {isCompleted ? (
                            <button type="button" onClick={() => void deleteSurah(id, surah.number).then(refreshAll)} className="rounded-lg border px-2.5 py-1.5 text-xs">
                              حذف
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(job)}
                              onClick={() => startSurahDownload(id, surah.number)}
                              className="rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50"
                            >
                              {failedEntry ? 'إعادة' : 'تنزيل'}
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
