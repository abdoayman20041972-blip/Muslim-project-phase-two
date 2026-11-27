import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuranReaderView } from './QuranReaderView'
import { QuranAudioProvider } from './QuranAudioProvider'
import { __resetQuranPreferencesForTests } from './useQuranPreferences'
import { ConfirmDialogProvider, useConfirmDialog } from '../../components/confirm-dialog'
import { ScreenActiveContext, backHandlerCount, runTopBackHandler } from '../../backStack'

vi.mock('./QuranOfflinePlayer', () => ({ QuranOfflinePlayer: () => null }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))

const reader = (active: boolean) => (
  <ConfirmDialogProvider>
    <ScreenActiveContext.Provider value={active}>
      <QuranAudioProvider setView={vi.fn()}>
        <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
      </QuranAudioProvider>
    </ScreenActiveContext.Provider>
  </ConfirmDialogProvider>
)

describe('Quran reader overlays on a hidden screen', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetQuranPreferencesForTests()
    window.scrollTo = vi.fn()
  })

  it('drops its back handler when the screen is hidden with an overlay open, and re-registers when visible again', async () => {
    const { rerender } = render(reader(true))
    fireEvent.click(await screen.findByLabelText('معلومات عن السورة'))
    expect(backHandlerCount()).toBe(1)
    // Navigated away (notification tap, Quick Tools...): reader stays mounted but hidden.
    rerender(reader(false))
    expect(backHandlerCount()).toBe(0)
    expect(runTopBackHandler()).toBe(false) // hardware back goes to normal navigation
    rerender(reader(true))
    expect(backHandlerCount()).toBe(1)
    await act(async () => { runTopBackHandler() })
    expect(backHandlerCount()).toBe(0)
  })

  it('Escape closes the reader overlay only when it is topmost; a dialog over it takes the key first', async () => {
    let ask: () => void = () => undefined
    function Asker() {
      const { confirm } = useConfirmDialog()
      ask = () => void confirm({ message: 'تأكيد؟' })
      return null
    }
    render(
      <ConfirmDialogProvider>
        <Asker />
        <ScreenActiveContext.Provider value={true}>
          <QuranAudioProvider setView={vi.fn()}>
            <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
          </QuranAudioProvider>
        </ScreenActiveContext.Provider>
      </ConfirmDialogProvider>,
    )
    fireEvent.click(await screen.findByLabelText('معلومات عن السورة'))
    expect(backHandlerCount()).toBe(1)
    await act(async () => { ask() })
    expect(screen.getByText('تأكيد؟')).toBeTruthy()
    expect(backHandlerCount()).toBe(2)
    // Hardware back and Escape both close the dialog first and leave the reader overlay open.
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('تأكيد؟')).toBeNull())
    expect(backHandlerCount()).toBe(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(backHandlerCount()).toBe(0))
  })

  it('a hidden reader ignores Escape', async () => {
    const { rerender } = render(reader(true))
    fireEvent.click(await screen.findByLabelText('معلومات عن السورة'))
    rerender(reader(false))
    fireEvent.keyDown(document, { key: 'Escape' })
    rerender(reader(true))
    expect(backHandlerCount()).toBe(1) // overlay state survived, so Escape did not touch it
    await act(async () => { runTopBackHandler() })
  })
})
