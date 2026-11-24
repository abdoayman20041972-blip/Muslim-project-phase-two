import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QuranReaderView } from './QuranReaderView'
import { QuranAudioProvider, useQuranAudio } from './QuranAudioProvider'
import { __resetQuranPreferencesForTests } from './useQuranPreferences'
import { APP_SETTINGS_KEYS } from '../../settings'

vi.mock('./QuranOfflinePlayer', () => ({ QuranOfflinePlayer: () => null }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))

const audioInstances: MockAudio[] = []
class MockAudio extends EventTarget {
  src = ''
  duration = 120
  currentTime = 0
  readyState = 0
  preload = ''
  play = vi.fn(async () => { this.dispatchEvent(new Event('playing')) })
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn(() => { this.src = '' })
  constructor(url = '') { super(); this.src = url; audioInstances.push(this) }
}

function PlayAyahHundredButton() {
  const audio = useQuranAudio()
  return (
    <button
      onClick={() => audio.playSingleAyah({ number: 106, numberInSurah: 100, text: 'آية' }, 'ar.minshawi', 2)}
    >
      تشغيل آية بعيدة
    </button>
  )
}

function renderReader() {
  return render(
    <QuranAudioProvider setView={vi.fn()}>
      <PlayAyahHundredButton />
      <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
    </QuranAudioProvider>,
  )
}

function pageIndicator(nav: HTMLElement): string {
  return within(nav).getByText(/\//).textContent ?? ''
}

describe('Quran reader phase six', () => {
  beforeEach(() => {
    audioInstances.length = 0
    localStorage.clear()
    __resetQuranPreferencesForTests()
    vi.stubGlobal('Audio', MockAudio)
    window.scrollTo = vi.fn()
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { metadata: null, playbackState: 'none', setActionHandler: vi.fn() },
    })
  })

  it('follows a newly played ayah but never snaps back after a manual page turn (س07)', async () => {
    localStorage.setItem(APP_SETTINGS_KEYS.readingLayout, 'pages')
    __resetQuranPreferencesForTests()
    renderReader()
    const nav = await screen.findByLabelText('تنقل الصفحات')
    const initial = pageIndicator(nav)
    expect(initial).toContain('١')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تشغيل آية بعيدة' })))
    await waitFor(() => expect(pageIndicator(nav)).not.toBe(initial))
    const followed = pageIndicator(nav)

    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    const afterNext = pageIndicator(nav)
    expect(afterNext).not.toBe(followed)
    // Give any stale effect a chance to fire: the page must stay where the user put it.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(pageIndicator(nav)).toBe(afterNext)
  })

  it('saves the page position and restores it on the next visit (س16, pages)', async () => {
    localStorage.setItem(APP_SETTINGS_KEYS.readingLayout, 'pages')
    __resetQuranPreferencesForTests()
    const first = renderReader()
    const nav = await screen.findByLabelText('تنقل الصفحات')
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_KEYS.readingPosition) || 'null')
      expect(saved).toMatchObject({ surah: 2, layout: 'pages', pageIndex: 2 })
    })
    const thirdPage = pageIndicator(nav)
    first.unmount()

    renderReader()
    const navAgain = await screen.findByLabelText('تنقل الصفحات')
    await waitFor(() => expect(pageIndicator(navAgain)).toBe(thirdPage))
  })

  it('restores the scroll-mode position by scrolling to the saved ayah (س16, scroll)', async () => {
    const scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView
    localStorage.setItem(
      APP_SETTINGS_KEYS.readingPosition,
      JSON.stringify({ surah: 2, layout: 'scroll', ayah: 50, updatedAt: Date.now() }),
    )
    renderReader()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    delete (window.HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
  })

  it('confirms a successful copy with a visible message', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderReader()
    const options = await screen.findAllByLabelText(/خيارات الآية/)
    fireEvent.click(options[1])
    fireEvent.click(await screen.findByRole('button', { name: 'نسخ الآية' }))
    expect(await screen.findByRole('status')).toHaveTextContent('تم نسخ الآية')
    expect(writeText).toHaveBeenCalled()
  })

  it('reports failure instead of success when the Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    renderReader()
    const options = await screen.findAllByLabelText(/خيارات الآية/)
    fireEvent.click(options[1])
    fireEvent.click(await screen.findByRole('button', { name: 'نسخ الآية' }))
    expect(await screen.findByRole('status')).toHaveTextContent('تعذّر النسخ، جرّب مرة أخرى')
  })
})
