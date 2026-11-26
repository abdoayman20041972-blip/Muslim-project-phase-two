import { Capacitor } from '@capacitor/core'
import { shareImageBlob } from '../azkar/shareCard'
import { showShareFailure } from '../azkar/shareActions'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { toPng } from 'html-to-image'
import { surahList } from '../../../quran-meta'
import {
  BISMILLAH,
  toArabicNumber,
  type Ayah,
  type View,
} from '../../constants'
import { useQuranReaderData } from './useQuranReaderData'
import { useQuranPreferences } from './useQuranPreferences'
import { BackButton } from '../../components/app-chrome'
import { juzForPage } from './juz'
import { useQuranAudio } from './QuranAudioProvider'
import { QuranOfflinePlayer } from './QuranOfflinePlayer'
import { ReciterPicker } from './ReciterPicker'
import { QURAN_AUDIO_RECITERS, QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from './quranAudioPlayback'
import { useQuranTafsir } from './useQuranTafsir'
import { AyahCenterCard } from './center/AyahCenterCard'
import { SurahInfoCard } from './center/SurahInfoCard'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'
import { assertQuranPageMap, groupSurahPages, type QuranPageMap } from './quranPageIntegrity'
import { loadReadingPosition, saveReadingPosition } from './readingPosition'

type Props = { view: Extract<View, { name: 'mushaf-surah' }>; setView: (v: View) => void }

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4.5" height="15" rx="1" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M10.16 4.83L10.68 2.49L13.32 2.49L13.84 4.83L15.77 5.63L17.79 4.34L19.66 6.21L18.37 8.23L19.17 10.16L21.51 10.68L21.51 13.32L19.17 13.84L18.37 15.77L19.66 17.79L17.79 19.66L15.77 18.37L13.84 19.17L13.32 21.51L10.68 21.51L10.16 19.17L8.23 18.37L6.21 19.66L4.34 17.79L5.63 15.77L4.83 13.84L2.49 13.32L2.49 10.68L4.83 10.16L5.63 8.23L4.34 6.21L6.21 4.34L8.23 5.63Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function trapDialogFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') return
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(
      'button,select,input,[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((x) => !x.hasAttribute('disabled'))
  if (!items.length) return
  const first = items[0],
    last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
function BookOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
    </svg>
  )
}
export function QuranReaderView({ view, setView }: Props) {
  const activeSurah = surahList.find((s) => s.number === view.number)
  const { ayahs, loading, error } = useQuranReaderData(view.number)
  const {
    fontSize,
    setFontSize,
    layout: requestedLayout,
    setLayout,
    fontConfig: fs,
  } = useQuranPreferences()
  const { current, currentSurah, playing, buffering, playback, repeat, setRepeat, playSingleAyah, playConnected, toggleCurrent, reciter, setReciter, memorize } = useQuranAudio()
  const [pageIndex, setPageIndex] = useState(0)
  const [readingMode, setReadingMode] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [panel, setPanel] = useState<Ayah | null>(null)
  const [centerFor, setCenterFor] = useState<Ayah | null>(null)
  const [surahInfoOpen, setSurahInfoOpen] = useState(false)
  const [memorizeHideText, setMemorizeHideText] = useState(() => readSetting(APP_SETTINGS_KEYS.quranMemorizeHide, '0') === '1')
  const mushafRef = useRef<HTMLDivElement | null>(null)
  // س07: the audio follow effect may only move the page when the PLAYING AYAH
  // changes, never when the user turned the page manually.
  const lastFollowedAyahRef = useRef<number | null>(null)
  // س16: the saved reading position is applied once per surah view; saving
  // starts only after the restore decision so an old position is not
  // overwritten with page 0 / ayah 1 on entry.
  const restoreDoneRef = useRef(false)
  const panelAnchorRef = useRef<HTMLElement | null>(null)
  const panelToolbarRef = useRef<HTMLDivElement | null>(null)
  const { tafsirFor, tafsirText, tafsirLoading, tafsirError, tafsirLabel, openTafsir: loadTafsir, closeTafsir } = useQuranTafsir(view.number)
  const [shareFor, setShareFor] = useState<Ayah | null>(null)
  const [selectedAyah, setSelectedAyah] = useState<{ surah: number; ayah: number } | null>(null)
  const visibleCurrent = selectedAyah?.surah === view.number ? selectedAyah.ayah : currentSurah === view.number ? current : null
  const shareCardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanel(null)
        setShareFor(null)
        setCenterFor(null)
        setSurahInfoOpen(false)
        closeTafsir()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeTafsir])

  useLayoutEffect(() => {
    if (!panel) return
    const anchor = panelAnchorRef.current
    const toolbar = panelToolbarRef.current
    if (!anchor || !toolbar) return

    const updatePosition = () => {
      const anchorRect = anchor.getBoundingClientRect()
      const toolbarRect = toolbar.getBoundingClientRect()
      const margin = 8
      const gap = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top = anchorRect.top - toolbarRect.height - gap
      if (top < margin) top = anchorRect.bottom + gap
      if (top + toolbarRect.height > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - toolbarRect.height - margin)
      }

      const centeredLeft = anchorRect.left + (anchorRect.width - toolbarRect.width) / 2
      const left = Math.min(
        Math.max(margin, centeredLeft),
        Math.max(margin, viewportWidth - toolbarRect.width - margin),
      )

      toolbar.style.top = `${top}px`
      toolbar.style.left = `${left}px`
      toolbar.style.opacity = '1'
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [panel])

  const [quranPageMap, setQuranPageMap] = useState<QuranPageMap | null>(null)
  const [pageMapFailed, setPageMapFailed] = useState(false)

  useEffect(() => {
    if (requestedLayout !== 'pages' || quranPageMap) return
    let cancelled = false
    setPageMapFailed(false)
    import('./data/quran-pages.json')
      .then((module) => {
        assertQuranPageMap(module.default, surahList)
        if (!cancelled) setQuranPageMap(module.default)
      })
      .catch(() => {
        if (!cancelled) setPageMapFailed(true)
      })
    return () => { cancelled = true }
  }, [requestedLayout, quranPageMap])

  const pageGroups = useMemo(() => (
    ayahs && quranPageMap ? groupSurahPages(ayahs, view.number, quranPageMap) : []
  ), [ayahs, view.number, quranPageMap])
  const pageMapUnavailable = pageMapFailed || Boolean(quranPageMap && ayahs?.length && !pageGroups.length)
  // Never render an empty page frame while the map loads or if validation fails.
  // Keep the saved preference intact; this fallback applies only to this session.
  const layout = requestedLayout === 'pages' && pageGroups.length ? 'pages' : 'scroll'

  const totalPages = Math.max(1, pageGroups.length)
  const safePage = Math.min(pageIndex, totalPages - 1)
  const visibleAyahs = !ayahs
    ? []
    : layout === 'pages'
      ? pageGroups.length
        ? ayahs.slice(pageGroups[safePage].startIndex, pageGroups[safePage].endIndex + 1)
        : []
      : ayahs
  const currentRealPageNumber = pageGroups[safePage]?.realPageNumber
  const currentJuz = juzForPage(currentRealPageNumber)
  const showSurahStart = layout !== 'pages' || visibleAyahs[0]?.numberInSurah === 1
  const showBismillah = showSurahStart && view.number !== 1 && view.number !== 9
  useEffect(() => {
    if (layout === 'pages') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageIndex, layout, view.number])

  useEffect(() => {
    if (layout !== 'pages' || currentSurah !== view.number || current == null || !pageGroups.length) return
    // Follow only a NEW playing ayah. Manual page turns leave the page alone
    // (س07: the buttons used to snap back to the previously playing ayah).
    if (lastFollowedAyahRef.current === current) return
    lastFollowedAyahRef.current = current
    const ayahIndex = ayahs?.findIndex((item) => item.numberInSurah === current) ?? -1
    if (ayahIndex < 0) return
    const nextPageIndex = pageGroups.findIndex((group) => ayahIndex >= group.startIndex && ayahIndex <= group.endIndex)
    if (nextPageIndex >= 0) setPageIndex((previous) => (nextPageIndex !== previous ? nextPageIndex : previous))
  }, [layout, currentSurah, current, view.number, ayahs, pageGroups])

  // A stopped or connected session must not pin the last-followed ayah: the
  // next single-ayah play, even of the same ayah, follows again.
  useEffect(() => { lastFollowedAyahRef.current = null }, [view.number])
  useEffect(() => { if (current == null) lastFollowedAyahRef.current = null }, [current])

  // س16: restore the saved reading position once, after the data (and the page
  // map in page mode) is ready, then keep saving it as reading continues.
  const savedPositionRef = useRef<ReturnType<typeof loadReadingPosition> | null>(null)
  if (savedPositionRef.current === null) savedPositionRef.current = loadReadingPosition()
  useEffect(() => {
    if (restoreDoneRef.current || !ayahs?.length) return
    const saved = savedPositionRef.current
    if (!saved || saved.surah !== view.number) {
      restoreDoneRef.current = true
      return
    }
    if (saved.layout === 'pages' && saved.pageIndex !== undefined) {
      if (layout !== 'pages') {
        // The surah data and the page map load through two independent async
        // imports, and layout stays 'scroll' until BOTH are ready. Marking the
        // restore done here used to drop a saved page position forever whenever
        // the surah data won the race (observed as a load-dependent flake: the
        // reader stayed on page 1). Wait while the map can still arrive; give
        // up only when pages are genuinely unavailable (failed or invalid map).
        if (requestedLayout === 'pages' && !pageMapFailed && !(quranPageMap && !pageGroups.length)) return
        restoreDoneRef.current = true
        return
      }
      restoreDoneRef.current = true
      setPageIndex(Math.min(saved.pageIndex, Math.max(0, pageGroups.length - 1)))
      return
    }
    if (saved.layout === 'scroll' && saved.ayah !== undefined) {
      if (layout !== 'scroll') {
        restoreDoneRef.current = true
        return
      }
      restoreDoneRef.current = true
      const target = mushafRef.current?.querySelector(`[data-ayah="${saved.ayah}"]`)
      if (target instanceof HTMLElement) {
        try {
          target.scrollIntoView({ block: 'start' })
        } catch {
          // jsdom and older WebViews lack scrollIntoView; the position is still saved.
        }
      }
      return
    }
    restoreDoneRef.current = true
  }, [ayahs, layout, pageGroups, view.number, requestedLayout, pageMapFailed, quranPageMap])

  // Page mode: every settled page is the reading position.
  useEffect(() => {
    if (!restoreDoneRef.current || layout !== 'pages' || !pageGroups.length) return
    saveReadingPosition({
      surah: view.number,
      layout: 'pages',
      pageIndex: safePage,
      realPage: pageGroups[safePage]?.realPageNumber,
    })
  }, [layout, safePage, pageGroups, view.number])

  // Scroll mode: the first visible ayah is the reading position, sampled while
  // scrolling (throttled) and once when leaving the surah.
  useEffect(() => {
    if (layout !== 'scroll' || !ayahs?.length) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const capture = () => {
      if (!restoreDoneRef.current) return
      const surface = mushafRef.current
      if (!surface) return
      const marks = surface.querySelectorAll('[data-ayah]')
      for (const mark of marks) {
        const rect = mark.getBoundingClientRect()
        if (rect.bottom > 96 && rect.top < window.innerHeight) {
          const ayah = Number(mark.getAttribute('data-ayah'))
          if (Number.isInteger(ayah) && ayah >= 1) {
            saveReadingPosition({ surah: view.number, layout: 'scroll', ayah })
          }
          return
        }
      }
    }
    const onScroll = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        capture()
      }, 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timer) clearTimeout(timer)
      capture()
    }
  }, [layout, ayahs, view.number])

  function handleToggle() {
    if (currentSurah === view.number && playback?.kind === 'connected') toggleCurrent()
    else playConnected(0, ayahs || [], reciter, view.number)
  }
  function save(a: Ayah) {
    setSelectedAyah({ surah: view.number, ayah: a.numberInSurah })
  }
  async function openShare(a: Ayah) {
    setPanel(null)
    setShareFor(a)
  }
  async function shareCard() {
    const card = shareCardRef.current
    if (!card) return
    try {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch (error) { console.debug('[QuranReaderView]', error) }
      }
      const dataUrl = await toPng(card, {
        cacheBust: true,
        pixelRatio: 4,
        backgroundColor: getComputedStyle(card).backgroundColor,
      })
      const [, encoded] = dataUrl.split(',')
      const binary = atob(encoded)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'image/png' })
      if (await shareImageBlob(blob, 'muslim-ayah-card.png')) return
      if (Capacitor.isNativePlatform()) { showShareFailure(); return }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'muslim-ayah-card.png'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) { console.debug('[QuranReaderView]', error); showShareFailure() }
  }
  function openCenter(a: Ayah) {
    setPanel(null)
    setCenterFor(a)
    loadTafsir(a)
  }
  function closeCenter() {
    setCenterFor(null)
    closeTafsir()
  }
  const memorizeAyahInSurah = memorize && memorize.surah === view.number && !memorize.complete && memorize.status !== 'error' ? memorize.ayah : null
  const changeMemorizeHideText = (value: boolean) => {
    setMemorizeHideText(value)
    writeSetting(APP_SETTINGS_KEYS.quranMemorizeHide, value ? '1' : '0')
  }
  if (!activeSurah) return null
  return (
    <div className={`quran-reader-redesign ${readingMode ? "quran-reading-active" : ""}`}>
      {readingMode ? (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 border-b border-azkar-gold-soft bg-azkar-card/95 backdrop-blur px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_4px_18px_rgba(31,61,52,.08)] overflow-hidden">
            <div className="mx-auto flex h-11 max-w-3xl items-center gap-1.5 overflow-hidden" dir="rtl">
              <button
                onClick={() => setReadingMode(false)}
                aria-label="إغلاق وضع القراءة"
                className="order-3 h-10 w-10 shrink-0 rounded-full bg-azkar-card border border-azkar-gold-soft shadow-sm flex items-center justify-center text-azkar-ink-soft"
              >
                <CloseIcon />
              </button>
              <div
                className="order-2 min-w-0 flex-1 overflow-hidden text-center"
                dir="rtl"
              >
                <div className="flex h-11 items-center justify-center gap-2">
                  <div className="min-w-0 max-w-full font-amiri font-bold text-base leading-11 text-azkar-teal-ink truncate">
                    {activeSurah!.shortName}
                  </div>
                  <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={playing && currentSurah === view.number && playback?.kind === 'connected' ? 'إيقاف التلاوة' : 'تشغيل السورة'}
                    className="u-pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azkar-teal-deep text-azkar-card shadow-sm"
                  >
                    {playing && currentSurah === view.number && playback?.kind === 'connected' ? <PauseIcon /> : <PlayIcon />}
                  </button>
                </div>
              </div>
              <ReciterPicker label="القارئ في وضع القراءة" value={reciter} onChange={setReciter}
                className="order-1 h-10 w-[7.5rem] shrink-0" />
            </div>
          </div>
        </>
      ) : (
        <div className="quran-reader-header flex items-center gap-3 mb-5">
          <BackButton onClick={() => setView({ name: 'mushaf-list' })} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-amiri font-bold text-2xl text-azkar-teal-ink">
              {activeSurah!.shortName}
            </div>
            <div className="text-[0.6875rem] text-azkar-ink-faint mt-0.5 truncate">
              {activeSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} ·{' '}
              {toArabicNumber(activeSurah.numberOfAyahs)} آية ·{' '}
              {QURAN_AUDIO_RECITER_LABELS[reciter as QuranAudioReciter] ?? reciter}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSurahInfoOpen(true)}
            aria-label="معلومات عن السورة"
            className="u-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-azkar-gold-soft bg-azkar-card text-azkar-teal-ink"
          >
            <InfoIcon />
          </button>
          <button
            type="button"
            onClick={() => setControlsOpen((v) => !v)}
            aria-label="خيارات القراءة"
            aria-expanded={controlsOpen}
            aria-controls="quran-reader-controls"
            className="u-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-azkar-gold-soft bg-azkar-card text-azkar-teal-ink"
          >
            <GearIcon />
          </button>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={playing && currentSurah === view.number && playback?.kind === 'connected' ? 'إيقاف التلاوة' : 'تشغيل السورة'}
            aria-busy={buffering}
            className="u-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azkar-teal-deep text-azkar-card shadow-sm"
          >
            {playing && currentSurah === view.number && playback?.kind === 'connected' ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      )}
      {!readingMode && (
        <>
          {controlsOpen && (
            <div id="quran-reader-controls" className="space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <ReciterPicker label="القارئ" value={reciter} onChange={setReciter}
                  className="h-11 w-full rounded-[1.1rem]" />
                <select
                  aria-label="التكرار"
                  value={repeat}
                  onChange={(e) => {
                    const next = e.target.value as typeof repeat
                    setRepeat(next)
                  }}
                  className="h-11 rounded-[1.1rem] bg-azkar-card border border-azkar-gold-soft px-3 text-xs"
                >
                  <option value="off">بدون تكرار</option>
                  <option value="ayah" disabled={playback?.kind !== 'single-ayah'}>تكرار الآية</option>
                  <option value="surah" disabled={playback?.kind === 'single-ayah'}>تكرار السورة</option>
                </select>
              </div>
              <div className="rounded-[1.3rem] border border-azkar-gold-soft bg-azkar-card p-3 flex items-center justify-between">
                <button
                  onClick={() => setReadingMode(true)}
                  className="u-pressable rounded-full bg-azkar-teal px-3.5 py-2 text-[0.6875rem] font-bold text-azkar-card"
                >
                  وضع القراءة
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[0.6875rem] text-azkar-ink-soft">{fs.label}</span>
                  <button
                    aria-label="تصغير الخط"
                    onClick={() =>
                      setFontSize(
                        fontSize === 'sm'
                          ? 'sm'
                          : ({ sm: 'sm', md: 'sm', lg: 'md', xl: 'lg' } as const)[fontSize],
                      )
                    }
                    disabled={fontSize === 'sm'}
                    className="h-10 w-10 rounded-full bg-azkar-bg-alt text-lg leading-none disabled:opacity-40"
                  >
                    −
                  </button>
                  <button
                    aria-label="تكبير الخط"
                    onClick={() =>
                      setFontSize(
                        fontSize === 'xl'
                          ? 'xl'
                          : ({ sm: 'md', md: 'lg', lg: 'xl', xl: 'xl' } as const)[fontSize],
                      )
                    }
                    disabled={fontSize === 'xl'}
                    className="h-10 w-10 rounded-full bg-azkar-bg-alt text-lg leading-none disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="rounded-[1.3rem] border border-azkar-gold-soft bg-azkar-card p-1.5 grid grid-cols-2 gap-1">
                <button
                  onClick={() => setLayout('scroll')}
                  aria-pressed={requestedLayout === 'scroll'}
                  className={`rounded-[1rem] py-2 text-[0.6875rem] ${layout === 'scroll' ? 'bg-azkar-teal text-azkar-card' : 'text-azkar-teal'}`}
                >
                  آيات
                </button>
                <button
                  onClick={() => setLayout('pages')}
                  aria-pressed={requestedLayout === 'pages'}
                  className={`rounded-[1rem] py-2 text-[0.6875rem] ${layout === 'pages' ? 'bg-azkar-teal text-azkar-card' : 'text-azkar-teal'}`}
                >
                  صفحات
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!readingMode && (
        <QuranOfflinePlayer
          reciter={reciter as QuranAudioReciter}
          surahNumber={view.number}
        />
      )}
      {loading && (
        <div className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card text-center text-sm text-azkar-ink-soft py-12">
          جاري تحميل السورة...
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-[var(--r-lg)] border border-azkar-gold-soft bg-azkar-card text-center text-sm text-azkar-ink-soft py-12 px-4">
          {error}
        </div>
      )}
      {requestedLayout === 'pages' && pageMapUnavailable && (
        <div role="alert" className="mb-3 rounded-xl border border-azkar-gold-soft bg-azkar-card p-4 text-sm text-azkar-ink">
          <p>تعذّر التحقق من خريطة الصفحات. نعرض الآيات بالتمرير حتى تتمكن من متابعة القراءة بأمان.</p>
          <button className="u-pressable mt-2 rounded-xl border px-3 py-2" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</button>
          <button className="u-pressable m-2 rounded-xl border px-3 py-2" onClick={() => setLayout('scroll')}>متابعة بوضع الآيات</button>
        </div>
      )}
      {requestedLayout === 'pages' && !quranPageMap && !pageMapFailed && (
        <p role="status" className="mb-3 text-sm text-azkar-ink-soft">جاري التحقق من الصفحات، يمكنك القراءة بالتمرير الآن.</p>
      )}
      {layout === 'pages' && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-[1.1rem] border border-azkar-gold-soft bg-azkar-card p-2"
          aria-label="تنقل الصفحات"
        >
          <button
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="u-pressable min-h-11 rounded-xl border px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-[0.6875rem] font-bold text-azkar-teal-ink" aria-live="polite">
            {toArabicNumber(safePage + 1)} / {toArabicNumber(totalPages)}
            {currentRealPageNumber != null && ` · صفحة ${toArabicNumber(currentRealPageNumber)}`}
          </span>
          <button
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="u-pressable min-h-11 rounded-xl border px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
      {ayahs && (
        <div
          ref={mushafRef}
          key={layout === 'pages' ? safePage : 'flow'}
          className={`quran-mushaf-surface relative mx-auto overflow-hidden border border-azkar-gold-soft bg-azkar-card shadow-sm ${layout === 'pages' ? 'quran-real-page max-w-2xl min-h-[78vh] rounded-[.35rem] p-7 md:p-10' : readingMode ? 'max-w-xl min-h-[62vh] rounded-[1.6rem] p-7 md:p-10' : 'rounded-[var(--r-lg)] p-5'} ${readingMode ? 'pt-24 pb-32' : ''}`}
        >
          {layout === 'pages' && (
            <div className="quran-page-header" aria-hidden="true">
              <span>{currentJuz != null ? `الجزء ${toArabicNumber(currentJuz)}` : 'المصحف'}</span>
              <span>صفحة {toArabicNumber(currentRealPageNumber ?? 1)}</span>
              <span>{activeSurah!.name}</span>
            </div>
          )}
          {showSurahStart && (
            <div className="quran-surah-start">
              <div className="quran-surah-banner">
                <span className="quran-banner-orn" aria-hidden="true" />
                <span className="quran-banner-title font-amiri">{activeSurah!.name}</span>
                <span className="quran-banner-orn" aria-hidden="true" />
              </div>
              {showBismillah && (
                <div className="quran-page-bismillah font-amiri leading-relaxed">{BISMILLAH}</div>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full border border-azkar-gold-soft/50" />
          <div className={`quran-page-text relative font-amiri ${layout === 'pages' ? 'quran-page-flow' : ''}`}>
            <p className={`${fs.text} ${fs.leading} text-justify`}>
              {visibleAyahs.map((a) => (
                <span
                  key={a.number}
                  data-ayah={a.numberInSurah}
                  onClick={(e) => {
                    save(a)
                    panelAnchorRef.current = e.currentTarget
                    setPanel(a)
                  }}
                  role="presentation"
                  className={'cursor-pointer rounded-md ' + (playback?.kind !== 'connected' && visibleCurrent === a.numberInSurah ? 'bg-azkar-gold/20 ' : '') + (memorizeAyahInSurah === a.numberInSurah ? 'bg-azkar-gold/20 ' : '') + (memorizeHideText && memorizeAyahInSurah === a.numberInSurah ? 'quran-ayah-masked ' : '')}
                >
                  {a.text}
                  <button
                    aria-label={`خيارات الآية ${toArabicNumber(a.numberInSurah)}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      panelAnchorRef.current = e.currentTarget.closest('[data-ayah]')
                      setPanel(a)
                    }}
                    className="inline-flex items-center justify-center w-6 h-6 mx-1 rounded-full border border-azkar-gold-soft bg-azkar-bg-alt text-azkar-gold text-[0.6875rem] align-middle"
                  >
                    {toArabicNumber(a.numberInSurah)}
                  </button>{' '}
                </span>
              ))}
            </p>
          </div>
          {layout === 'pages' && (
            <div className="quran-page-footer" aria-hidden="true">
              <span className="quran-page-number">{toArabicNumber(currentRealPageNumber ?? 1)}</span>
            </div>
          )}
        </div>
      )}
      {panel &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onClick={() => setPanel(null)}
            role="presentation"
          >
            <div
              ref={panelToolbarRef}
              role="toolbar"
              aria-label={`إجراءات الآية ${toArabicNumber(panel.numberInSurah)}`}
              onClick={(e) => e.stopPropagation()}
              className="quran-ayah-toolbar fixed flex items-center opacity-0 transition-opacity"
              style={{ top: 0, left: 0 }}
            >
              <button
                onClick={() => openShare(panel)}
                aria-label="مشاركة الآية"
                className="quran-tool-btn u-pressable"
              >
                <ShareIcon />
                مشاركة
              </button>
              <button
                onClick={() => openCenter(panel)}
                aria-label="تفسير الآية"
                className="quran-tool-btn u-pressable"
              >
                <BookOpenIcon />
                تفسير
              </button>
              <button
                onClick={() => {
                  setPanel(null)
                  playSingleAyah(panel, reciter as QuranAudioReciter, view.number)
                }}
                aria-label="استماع للآية"
                className="quran-tool-btn quran-tool-btn-primary u-pressable"
              >
                <PlayIcon />
                استماع
              </button>
            </div>
          </div>,
          document.body,
        )}
      {shareFor &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-black/45"
            onClick={() => setShareFor(null)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="مشاركة الآية"
              onKeyDown={trapDialogFocus}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[88vh] focus:outline-none rounded-t-[2rem] border-t border-azkar-gold-soft bg-azkar-card shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="font-amiri font-bold text-lg text-azkar-teal-ink">
                  مشاركة الآية
                </div>
                <button
                  onClick={() => setShareFor(null)}
                  aria-label="إغلاق المشاركة"
                  autoFocus
                  className="w-9 h-9 rounded-full bg-azkar-bg-alt flex items-center justify-center"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="px-5 pb-5">
                <div
                  ref={shareCardRef}
                  dir="rtl"
                  className="quran-share-card relative overflow-hidden text-center"
                >
                  <span className="quran-share-corner quran-share-corner-tr" />
                  <span className="quran-share-corner quran-share-corner-bl" />
                  <div className="quran-share-kicker">
                    القرآن الكريم
                  </div>
                  <div className="quran-share-ayah font-amiri">
                    {shareFor.text}
                  </div>
                  <div className="quran-share-meta">
                    <span className="truncate">{activeSurah!.shortName}</span>
                    <span className="shrink-0">الآية {toArabicNumber(shareFor.numberInSurah)}</span>
                  </div>
                  <div className="quran-share-brand">مسلم · Muslim</div>
                </div>
                <button
                  onClick={() => shareCard()}
                  className="u-pressable mt-4 w-full rounded-[1.1rem] bg-azkar-teal text-azkar-card py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <ShareIcon />
                  مشاركة البطاقة
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {centerFor && (
        <AyahCenterCard
          surah={activeSurah!}
          ayah={centerFor}
          ayahs={ayahs ?? []}
          reciter={reciter as QuranAudioReciter}
          tafsir={{
            text: tafsirText,
            loading: tafsirLoading,
            error: tafsirError,
            label: tafsirLabel,
            forThisAyah: tafsirFor?.number === centerFor.number,
          }}
          onTafsirTab={() => { if (tafsirFor?.number !== centerFor.number) loadTafsir(centerFor) }}
          onClose={closeCenter}
          hideText={memorizeHideText}
          onHideTextChange={changeMemorizeHideText}
        />
      )}
      {surahInfoOpen && (
        <SurahInfoCard surah={activeSurah!} onClose={() => setSurahInfoOpen(false)} />
      )}
    </div>
  )
}
