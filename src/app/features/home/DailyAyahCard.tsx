import { useCallback, useEffect, useRef, useState } from 'react'
import { toArabicNumber } from '../../constants'
import type { DailyAyah } from '../../../daily-ayahs'
import { copyText, shareText } from '../azkar/shareActions'
import { useQuranTafsir } from '../quran/useQuranTafsir'
import { dailyAyahReference, fullTextForDailyAyah, surahNumberForDailyAyah } from './dailyAyahFull'

type Panel = 'full' | 'tafsir' | null

function TafsirPanel({ ayah, surah, fullText }: { ayah: DailyAyah; surah: number; fullText: string | null }) {
  const { tafsirText, tafsirLoading, tafsirError, tafsirLabel, openTafsir } = useQuranTafsir(surah)
  useEffect(() => {
    openTafsir({ number: 0, numberInSurah: ayah.number, text: fullText ?? ayah.text })
  }, [openTafsir, ayah.number, ayah.text, fullText])
  return (
    <div data-testid="daily-ayah-tafsir" className="mt-2.5 rounded-xl bg-azkar-teal-tint px-3 py-2.5 text-right">
      <div className="text-[0.6875rem] font-bold text-azkar-teal-ink">{tafsirLabel}</div>
      {tafsirLoading ? (
        <div role="status" className="mt-1 text-[0.75rem] text-azkar-ink-soft">جارٍ تحميل التفسير…</div>
      ) : tafsirError || !tafsirText ? (
        <div role="alert" className="mt-1 text-[0.75rem] text-azkar-ink-soft">تعذر تحميل التفسير الآن. جرّب مرة أخرى عند توفر الإنترنت.</div>
      ) : (
        <div className="mt-1 text-[0.8125rem] leading-[1.9] text-azkar-ink">{tafsirText}</div>
      )}
    </div>
  )
}

export function DailyAyahCard({ ayah, onOpenSurah }: { ayah: DailyAyah; onOpenSurah?: (surah: number) => void }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [fullText, setFullText] = useState<string | null>(null)
  const [fullFailed, setFullFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const surah = surahNumberForDailyAyah(ayah)
  const reference = dailyAyahReference(ayah, toArabicNumber)

  // A new day brings a new ayah: forget the previous ayah's expanded state.
  useEffect(() => {
    setPanel(null); setFullText(null); setFullFailed(false); setNotice(null)
  }, [ayah.surah, ayah.number, ayah.text])
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])

  const flash = useCallback((text: string) => {
    setNotice(text)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 2500)
  }, [])

  const ensureFull = useCallback(async () => {
    if (fullText) return fullText
    const text = await fullTextForDailyAyah(ayah)
    if (text) setFullText(text)
    else setFullFailed(true)
    return text
  }, [ayah, fullText])

  async function toggleFull() {
    if (panel === 'full') { setPanel(null); return }
    setPanel('full')
    await ensureFull()
  }
  async function toggleTafsir() {
    if (panel === 'tafsir') { setPanel(null); return }
    setPanel('tafsir')
    await ensureFull()
  }
  // Copy and share use the complete verse; if it cannot load, the daily excerpt is used and the message says so.
  async function payload() {
    const full = await ensureFull()
    return { text: full ?? ayah.text, complete: Boolean(full) }
  }
  async function onCopy() {
    const { text, complete } = await payload()
    const ok = await copyText(`${text}\n\n${reference}`)
    flash(ok ? (complete ? 'تم نسخ الآية كاملة' : 'تم نسخ المقتطف فقط') : 'تعذر النسخ')
  }
  async function onShare() {
    const { text } = await payload()
    try {
      await shareText(text, { title: 'آية اليوم', source: `${reference}\nمن تطبيق مسلم` })
    } catch {
      flash('تعذرت المشاركة')
    }
  }

  const pill = 'u-pressable flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2 py-1.5 text-[0.6875rem] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold'
  const quiet = `${pill} bg-azkar-teal-tint text-azkar-teal-ink`
  const primary = `${pill} bg-azkar-gold-tint text-azkar-gold-deep`

  return (
    <div className="home-reference-ayah rounded-[1.5rem] border border-white/60 bg-white/85 px-5 py-3.5 text-center shadow-2xl backdrop-blur-md" data-testid="daily-ayah-card">
      <div className="home-ayah-ornament" aria-hidden="true">❧</div>
      <div className="mb-1 text-[0.6875rem] font-bold text-azkar-gold-deep">آية اليوم · مقتطف</div>
      <div className="font-amiri text-[1.5rem] font-bold leading-[1.8] text-[#173c35]">{ayah.text}</div>
      <div className="mt-1 text-[0.6875rem] font-semibold text-azkar-ink-soft">{reference}</div>

      {panel === 'full' && (
        <div data-testid="daily-ayah-full" className="mt-2.5 rounded-xl bg-azkar-gold-tint px-3 py-2.5">
          {fullText ? (
            <div className="font-amiri text-[1.25rem] font-bold leading-[2] text-[#173c35]">{fullText}</div>
          ) : fullFailed ? (
            <div role="alert" className="text-[0.75rem] text-azkar-ink-soft">تعذر تحميل نص الآية الكامل.</div>
          ) : (
            <div role="status" className="text-[0.75rem] text-azkar-ink-soft">جارٍ التحميل…</div>
          )}
        </div>
      )}
      {panel === 'tafsir' && surah && <TafsirPanel ayah={ayah} surah={surah} fullText={fullText} />}

      <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="إجراءات آية اليوم">
        <button type="button" className={primary} aria-expanded={panel === 'full'} onClick={toggleFull}>الآية كاملة</button>
        <button type="button" className={quiet} aria-expanded={panel === 'tafsir'} onClick={toggleTafsir}>التفسير</button>
        <button type="button" className={quiet} onClick={onCopy}>نسخ</button>
        <button type="button" className={quiet} onClick={onShare}>مشاركة</button>
      </div>
      {surah && onOpenSurah && (
        <button type="button" onClick={() => onOpenSurah(surah)} className="u-pressable mt-1 inline-flex min-h-10 items-center text-[0.6875rem] font-bold text-azkar-teal-ink underline underline-offset-2">فتح السورة في المصحف</button>
      )}
      <div role="status" aria-live="polite" className="min-h-[1rem] text-[0.6875rem] font-semibold text-azkar-teal-ink">{notice}</div>
      <div className="home-ayah-divider mt-1" aria-hidden="true" />
    </div>
  )
}
