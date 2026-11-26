import { useEffect, useState } from 'react'
import { quranAudioUrl, toArabicNumber, type Ayah } from '../../../constants'
import { useQuranAudio } from '../QuranAudioProvider'
import type { QuranAudioReciter } from '../quranAudioPlayback'
import type { SurahMeta } from '../../../../quran-meta'
import { countCachedMemorizeAudio, registerQuranAudioCache } from './memorizeAudioCache'

type Props = {
  surah: SurahMeta
  ayahs: Ayah[]
  startAyah: Ayah
  reciter: QuranAudioReciter
  hideText: boolean
  onHideTextChange: (value: boolean) => void
}

const REPEAT_CHOICES = [1, 2, 3, 5, 7, 10]
const GAP_CHOICES = [
  { value: 0, label: 'بدون فاصل' },
  { value: 1000, label: 'ثانية واحدة' },
  { value: 2000, label: 'ثانيتان' },
  { value: 3000, label: '٣ ثوانٍ' },
  { value: 5000, label: '٥ ثوانٍ' },
]

const selectClass =
  'h-10 w-full rounded-[0.9rem] border border-azkar-gold-soft bg-azkar-card px-3 text-sm text-azkar-ink'

/** Memorization drill controls: repeat an ayah or a range, optionally hiding the text. */
export function MemorizePanel({ surah, ayahs, startAyah, reciter, hideText, onHideTextChange }: Props) {
  const { startMemorize, memorize, stop, toggleCurrent, playing, error: audioError } = useQuranAudio()
  const [to, setTo] = useState(startAyah.numberInSurah)
  const [repeats, setRepeats] = useState(3)
  const [gapMs, setGapMs] = useState(1000)
  const [peek, setPeek] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  // Best-effort: the service worker enables offline replay of ayahs the device
  // has actually played before. Failure just means online-only drills.
  useEffect(() => { void registerQuranAudioCache() }, [])

  const active = memorize && memorize.surah === surah.number && !memorize.complete ? memorize : null
  const finished = memorize && memorize.surah === surah.number && memorize.complete ? memorize : null
  const currentAyah = memorize && memorize.surah === surah.number
    ? ayahs.find((a) => a.numberInSurah === memorize.ayah) ?? null
    : null

  useEffect(() => { setPeek(false) }, [memorize?.ayah, memorize?.surah])

  const begin = async () => {
    setPlanError(null)
    // Never start a drill that cannot play: without a connection every ayah in
    // the range must already have a local audio copy from an earlier session.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const urls = ayahs
        .filter((a) => a.numberInSurah >= startAyah.numberInSurah && a.numberInSurah <= to)
        .map((a) => quranAudioUrl(reciter, a.number))
      const cachedCount = await countCachedMemorizeAudio(urls).catch(() => 0)
      if (cachedCount < urls.length) {
        setPlanError('لا يوجد اتصال بالإنترنت وصوت هذه الآيات غير محفوظ بعد على جهازك. اتصل بالإنترنت لأول تشغيل، وبعدها يعمل التكرار دون اتصال.')
        return
      }
    }
    try {
      startMemorize({ reciter, surah: surah.number, from: startAyah, to, repeats, gapMs })
    } catch {
      setPlanError('راجع نطاق الآيات وعدد التكرارات ثم حاول مرة أخرى.')
    }
  }

  const retry = () => {
    if (!memorize) return
    const fromAyah = ayahs.find((a) => a.numberInSurah === memorize.from) ?? startAyah
    try {
      startMemorize({ reciter: memorize.reciter ?? reciter, surah: memorize.surah, from: fromAyah, to: memorize.to, repeats: memorize.repeats, gapMs: memorize.gapMs })
    } catch {
      setPlanError('راجع نطاق الآيات وعدد التكرارات ثم حاول مرة أخرى.')
    }
  }

  const errored = memorize && memorize.surah === surah.number && memorize.status === 'error' && !memorize.complete ? memorize : null

  if (errored) {
    return (
      <div className="space-y-4" data-testid="memorize-error">
        <div role="alert" className="rounded-[1.1rem] border border-red-300 bg-red-50 px-4 py-3 text-center text-sm leading-7 text-red-800">
          {audioError ?? 'تعذر تشغيل الصوت. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.'}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={retry}
            className="u-pressable flex-1 rounded-[1.1rem] bg-azkar-teal py-3 text-sm font-bold text-azkar-card"
          >
            إعادة المحاولة
          </button>
          <button
            type="button"
            onClick={() => stop()}
            className="u-pressable flex-1 rounded-[1.1rem] border border-azkar-gold-soft bg-azkar-card py-3 text-sm font-bold text-azkar-ink"
          >
            إنهاء التكرار
          </button>
        </div>
      </div>
    )
  }

  if (active || finished) {
    const drill = (active ?? finished)!
    return (
      <div className="space-y-4" data-testid="memorize-progress">
        {finished ? (
          <div className="rounded-[1.1rem] border border-azkar-gold-soft bg-azkar-bg-alt px-4 py-3 text-center text-sm font-bold text-azkar-teal-ink">
            اكتمل التكرار. أحسنت!
          </div>
        ) : (
          <div className="rounded-[1.1rem] border border-azkar-gold-soft bg-azkar-bg-alt px-4 py-3 text-sm text-azkar-ink">
            <div className="flex items-center justify-between">
              <span>
                الآية {toArabicNumber(drill.ayah)} من {toArabicNumber(drill.from)}–{toArabicNumber(drill.to)}
              </span>
              <span>
                التكرار {toArabicNumber(Math.min(drill.done + (drill.complete ? 0 : 1), drill.repeats))} من {toArabicNumber(drill.repeats)}
              </span>
            </div>
            <div className="mt-1 text-[0.6875rem] text-azkar-ink-soft">
              {drill.gap ? 'فاصل صمت…' : drill.status === 'loading' ? 'جارٍ التحميل…' : playing ? 'جارٍ التشغيل' : 'متوقف مؤقتًا'}
            </div>
          </div>
        )}
        {hideText && currentAyah && (
          <div className="rounded-[1.1rem] border border-azkar-gold-soft px-4 py-3">
            {peek ? (
              <div className="font-amiri text-[1.125rem] leading-[2.05] text-azkar-ink">{currentAyah.text}</div>
            ) : (
              <div className="py-2 text-center text-sm text-azkar-ink-soft">النص مخفي للاختبار الذاتي</div>
            )}
            <button
              type="button"
              onClick={() => setPeek((v) => !v)}
              className="u-pressable mt-2 w-full rounded-[0.9rem] bg-azkar-bg-alt py-2 text-[0.75rem] font-bold text-azkar-teal-ink"
            >
              {peek ? 'إخفاء النص مجددًا' : 'إظهار النص مؤقتًا'}
            </button>
          </div>
        )}
        <div className="flex gap-2">
          {!finished && (
            drill.status === 'loading' ? (
              <button
                type="button"
                disabled
                className="flex-1 rounded-[1.1rem] bg-azkar-teal/60 py-3 text-sm font-bold text-azkar-card"
              >
                جارٍ التحميل…
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleCurrent}
                className="u-pressable flex-1 rounded-[1.1rem] bg-azkar-teal py-3 text-sm font-bold text-azkar-card"
              >
                {drill.gap ? 'تخطي الفاصل' : playing ? 'إيقاف مؤقت' : 'استئناف'}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => stop()}
            className="u-pressable flex-1 rounded-[1.1rem] border border-azkar-gold-soft bg-azkar-card py-3 text-sm font-bold text-azkar-ink"
          >
            {finished ? 'إغلاق التكرار' : 'إنهاء التكرار'}
          </button>
        </div>
        <p className="text-center text-[0.6875rem] text-azkar-ink-soft">
          يمكنك إغلاق هذه البطاقة ومتابعة التكرار من المصحف؛ التحكم من المشغل المصغّر.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="memorize-form">
      <p className="text-[0.75rem] leading-6 text-azkar-ink-soft">
        كرّر آية أو مقطعًا بصوت قارئك للحفظ، مع إمكان إخفاء النص لاختبار نفسك.
      </p>
      <p className="rounded-[0.9rem] border border-azkar-gold-soft bg-azkar-bg-alt px-3 py-2 text-[0.6875rem] leading-5 text-azkar-ink-soft">
        أول تشغيل لكل آية يحتاج اتصالًا بالإنترنت؛ وما سبق تشغيله على هذا الجهاز يعمل دون اتصال متى حفظه المتصفح محليًا.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] font-bold text-azkar-ink-soft">من الآية</span>
          <span className="flex h-10 items-center rounded-[0.9rem] border border-azkar-gold-soft bg-azkar-bg-alt px-3 text-sm text-azkar-ink">
            {toArabicNumber(startAyah.numberInSurah)}
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] font-bold text-azkar-ink-soft">إلى الآية</span>
          <select
            aria-label="إلى الآية"
            className={selectClass}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
          >
            {Array.from({ length: surah.numberOfAyahs - startAyah.numberInSurah + 1 }, (_, i) => startAyah.numberInSurah + i).map((n) => (
              <option key={n} value={n}>{toArabicNumber(n)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] font-bold text-azkar-ink-soft">تكرار كل آية</span>
          <select
            aria-label="تكرار كل آية"
            className={selectClass}
            value={repeats}
            onChange={(e) => setRepeats(Number(e.target.value))}
          >
            {REPEAT_CHOICES.map((n) => (
              <option key={n} value={n}>{toArabicNumber(n)} {n === 1 ? 'مرة' : n === 2 ? 'مرتين' : 'مرات'}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] font-bold text-azkar-ink-soft">فاصل الصمت</span>
          <select
            aria-label="فاصل الصمت"
            className={selectClass}
            value={gapMs}
            onChange={(e) => setGapMs(Number(e.target.value))}
          >
            {GAP_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 rounded-[0.9rem] border border-azkar-gold-soft px-3 py-2.5">
        <input
          type="checkbox"
          checked={hideText}
          onChange={(e) => onHideTextChange(e.target.checked)}
          aria-label="إخفاء نص الآية أثناء التكرار"
        />
        <span className="text-[0.75rem] text-azkar-ink">إخفاء نص الآية أثناء التكرار للاختبار الذاتي</span>
      </label>
      {planError && <div role="alert" className="text-center text-[0.75rem] leading-6 text-red-700">{planError}</div>}
      <button
        type="button"
        onClick={begin}
        className="u-pressable w-full rounded-[1.1rem] bg-azkar-teal py-3.5 text-sm font-bold text-azkar-card"
      >
        ابدأ التكرار
      </button>
    </div>
  )
}
