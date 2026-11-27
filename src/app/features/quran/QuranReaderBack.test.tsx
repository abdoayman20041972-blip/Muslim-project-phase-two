import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuranReaderView } from './QuranReaderView'
import { QuranAudioProvider } from './QuranAudioProvider'
import { __resetQuranPreferencesForTests } from './useQuranPreferences'
import { backHandlerCount, runTopBackHandler } from '../../backStack'

vi.mock('./QuranOfflinePlayer', () => ({ QuranOfflinePlayer: () => null }))
vi.mock('./offlineDownload', () => ({ getDownloadedSurahBlob: vi.fn(async () => undefined) }))

describe('Quran reader hardware back', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetQuranPreferencesForTests()
    window.scrollTo = vi.fn()
  })

  it('closes the ayah actions panel first, then the share card layer, before leaving the screen', async () => {
    render(
      <QuranAudioProvider setView={vi.fn()}>
        <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
      </QuranAudioProvider>,
    )
    const opener = (await screen.findAllByRole('button', { name: /^خيارات الآية/ }))[0]
    expect(backHandlerCount()).toBe(0)
    fireEvent.click(opener)
    await screen.findByRole('dialog', { name: /^إجراءات الآية/ }).catch(() => screen.findByLabelText(/^إجراءات الآية/))
    expect(backHandlerCount()).toBe(1)
    await act(async () => { runTopBackHandler() })
    await waitFor(() => expect(screen.queryByLabelText(/^إجراءات الآية/)).toBeNull())
    expect(backHandlerCount()).toBe(0)
    expect(runTopBackHandler()).toBe(false)
  })

  it('closes the surah info sheet', async () => {
    render(
      <QuranAudioProvider setView={vi.fn()}>
        <QuranReaderView view={{ name: 'mushaf-surah', number: 2 }} setView={vi.fn()} />
      </QuranAudioProvider>,
    )
    fireEvent.click(await screen.findByLabelText('معلومات عن السورة'))
    expect(backHandlerCount()).toBe(1)
    await act(async () => { runTopBackHandler() })
    expect(backHandlerCount()).toBe(0)
  })
})
