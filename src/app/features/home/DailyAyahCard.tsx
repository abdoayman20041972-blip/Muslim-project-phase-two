import { useCallback, useEffect, useRef, useState } from 'react'
import { toArabicNumber } from '../../constants'
import type { DailyAyah } from '../../../daily-ayahs'
import { copyWithToast, showShareFailure } from '../azkar/shareActions'
import { shareCardImage } from '../azkar/shareCard'
import { useQuranTafsir } from '../quran/useQuranTafsir'
import { dailyAyahReference, fullTextForDailyAyah, surahNumberForDailyAyah } from './dailyAyahFull'

type Panel = 'full' | 'tafsir' | null

function TafsirPanel({ ayah, surah, fullText }: { ayah: DailyAyah; surah: number; fullText: string | null }) {
  const { tafsirText, tafsirLoading, tafsirError, tafsirLabel, openTafsir } = useQuranTafsir(surah)
  useEffect(() => {
    openTafsir({ number: 0, numberInSurah: ayah.number, text: fullText ?? ayah.text })
  }, [openTafsir, ayah.number, ayah.text, fullText])
  return (
    <div data-testid="daily-ayah-tafsir" className="home-ayah-panel mt-2.5 rounded-xl px-3 py-2.5 text-right">
      <div className="text-[0.6875rem] font-bold text-[#e9c875]">{tafsirLabel}</div>
      {tafsirLoading ? (
        <div role="status" className="mt-1 text-[0.75rem] text-white/75">جارٍ تحميل التفسير…</div>
      ) : tafsirError || !tafsirText ? (
        <div role="alert" className="mt-1 text-[0.75rem] text-white/75">تعذر تحميل التفسير الآن. جرّب مرة أخرى عند توفر الإنترنت.</div>
      ) : (
        <div className="mt-1 text-[0.8125rem] leading-[1.9] text-white">{tafsirText}</div>
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
    const { text } = await payload()
    await copyWithToast(text, reference)
  }
  async function onShare() {
    const { text } = await payload()
    try {
      const shared = await shareCardImage({ text, reference, heading: 'آية اليوم', verse: true, footer: 'مسلم', filename: 'ayah-of-the-day.png' })
      if (!shared) showShareFailure()
    } catch {
      flash('تعذرت المشاركة')
    }
  }

  const pill = 'home-ayah-act u-pressable relative flex flex-1 items-center justify-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold'
  const quiet = `${pill} home-ayah-act-quiet`
  const primary = `${pill} home-ayah-act-primary`

  return (
    <div className="home-reference-ayah home-ayah-green relative overflow-hidden rounded-[1.5rem] px-4 pb-2.5 pt-7 text-center" data-testid="daily-ayah-card">
      <span className="home-tile-shape home-tile-shape-a" aria-hidden="true" />
      <span className="home-tile-shape home-tile-shape-b" aria-hidden="true" />
      <span className="home-ayah-lines" aria-hidden="true" />
      <div className="relative z-10">
      <div className="mb-2 mt-2 text-[0.6875rem] font-bold text-[#e9c875]">آية اليوم</div>
      <div className="home-ayah-text font-quran font-bold text-white">{ayah.text}</div>

      {panel === 'full' && (
        <div data-testid="daily-ayah-full" className="home-ayah-panel mt-2.5 rounded-xl px-3 py-2.5">
          {fullText ? (
            <div className="font-quran text-[1.35rem] font-bold leading-[2] text-white">{fullText}</div>
          ) : fullFailed ? (
            <div role="alert" className="text-[0.75rem] text-white/75">تعذر تحميل نص الآية الكامل.</div>
          ) : (
            <div role="status" className="text-[0.75rem] text-white/75">جارٍ التحميل…</div>
          )}
        </div>
      )}
      {panel === 'tafsir' && surah && <TafsirPanel ayah={ayah} surah={surah} fullText={fullText} />}

      <div className="mt-2.5 flex items-center gap-1 px-3" role="group" aria-label="إجراءات آية اليوم">
        <button type="button" className={primary} aria-expanded={panel === 'full'} onClick={toggleFull}>الآية كاملة</button>
        <button type="button" className={quiet} aria-expanded={panel === 'tafsir'} onClick={toggleTafsir}>التفسير</button>
        <button type="button" className={quiet} onClick={onCopy} aria-label="نسخ الآية">نسخ</button>
        <button type="button" className={quiet} onClick={onShare}>مشاركة</button>
      </div>
      <div className="mt-1.5 text-[0.6875rem] font-semibold text-white/75">{reference}</div>
      {surah && onOpenSurah && (
        <button type="button" onClick={() => onOpenSurah(surah)} className="u-pressable mt-1 inline-flex min-h-8 items-center text-[0.6875rem] font-bold text-white/85 underline underline-offset-2">فتح السورة في المصحف</button>
      )}
      <div role="status" aria-live="polite" className="min-h-[1rem] text-[0.6875rem] font-semibold text-[#e9c875]">{notice}</div>
      </div>
    </div>
  )
}
