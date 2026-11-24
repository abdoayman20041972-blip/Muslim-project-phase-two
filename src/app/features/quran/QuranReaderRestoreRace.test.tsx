import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QuranReaderView } from './QuranReaderView'
import { QuranAudioProvider } from './QuranAudioProvider'
import { __resetQuranPreferencesForTests } from './useQuranPreferences'
import { APP_SETTINGS_KEYS } from '../../settings'

// Hold the page-map import at a gate the test controls, so the surah data is
// guaranteed to arrive FIRST. On the pre-fix reader this ordering permanently
// dropped a saved page position (the restore effect marked itself done while
// the layout was still the scroll fallback); the fixed reader waits for the
// map and restores. This test fails on the old code (final waitFor times out
// on page 1) and passes on the fix.
const gate = vi.hoisted(() => {
  const state: { release: () => void } = { release: () => {} }
  const promise = new Promise<void>((resolve) => { state.release = resolve })
  return { promise, ...state }
})

vi.mock('./data/quran-pages.json', async () => {
  const actual = await vi.importActual<typeof import('./data/quran-pages.json')>('./data/quran-pages.json')
  await gate.promise
  return actual
})
vi.mock('./QuranOfflinePlayer', () => ({ QuranOfflinePlayer: () => null }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))

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
  constructor(url = '') { super(); this.src = url }
}

function renderReader() {
  return render(
    <QuranAudioProvider setView={vi.fn()}>
      <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
    </QuranAudioProvider>,
  )
}

describe('reading-position restore vs page-map load race (س16 regression)', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetQuranPreferencesForTests()
    vi.stubGlobal('Audio', MockAudio)
    window.scrollTo = vi.fn()
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { metadata: null, playbackState: 'none', setActionHandler: vi.fn() },
    })
    localStorage.setItem(APP_SETTINGS_KEYS.readingLayout, 'pages')
    localStorage.setItem(
      APP_SETTINGS_KEYS.readingPosition,
      JSON.stringify({ surah: 2, layout: 'pages', pageIndex: 2, updatedAt: Date.now() }),
    )
  })

  it('waits for a late page map instead of dropping the saved page position', async () => {
    renderReader()

    // The surah data arrives while the map is still gated: the reader renders
    // the scroll fallback and must NOT treat the restore as done.
    await waitFor(() => expect(document.querySelector('[data-ayah]')).toBeTruthy())
    expect(screen.queryByLabelText('تنقل الصفحات')).toBeNull()

    // The map finally arrives: the saved page (index 2, shown as ٣) must
    // still be restored.
    gate.release()
    const nav = await screen.findByLabelText('تنقل الصفحات')
    await waitFor(() => expect(within(nav).getByText(/\//).textContent ?? '').toContain('٣'))
  })
})
