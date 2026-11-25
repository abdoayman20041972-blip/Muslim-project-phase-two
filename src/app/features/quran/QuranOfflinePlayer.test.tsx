import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuranOfflinePlayer } from './QuranOfflinePlayer'
import { isSurahDownloaded } from './offlineDownload'
vi.mock('./offlineDownload', () => ({ isSurahDownloaded: vi.fn() }))
const props = { reciter: 'ar.minshawi' as const, surahNumber: 1, autoStart: false, onAutoStartConsumed: vi.fn(), onNavigateToSurah: vi.fn() }
beforeEach(() => vi.clearAllMocks())
describe('QuranOfflinePlayer availability hint', () => {
  it('does not create a second audio element or own playback', async () => {
    vi.mocked(isSurahDownloaded).mockResolvedValue(true)
    const { container } = render(<QuranOfflinePlayer {...props} />)
    await waitFor(() => expect(screen.getByTestId('quran-offline-player')).toBeTruthy())
    expect(container.querySelector('audio')).toBeNull()
    expect(screen.getByText(/بدون إنترنت/)).toBeTruthy()
  })
  it('names the reciter whose recording is available offline', async () => {
    vi.mocked(isSurahDownloaded).mockResolvedValue(true)
    render(<QuranOfflinePlayer {...props} reciter="ar.husary" />)
    await waitFor(() => expect(screen.getByTestId('quran-offline-player').textContent).toContain('محمود خليل الحصري'))
  })
  it('hides when storage is unavailable', async () => {
    vi.mocked(isSurahDownloaded).mockRejectedValue(new Error('no storage'))
    render(<QuranOfflinePlayer {...props} />)
    await waitFor(() => expect(isSurahDownloaded).toHaveBeenCalled())
    expect(screen.queryByTestId('quran-offline-player')).toBeNull()
  })
  it('ignores late availability after changing surah', async () => {
    let resolve!: (value: boolean) => void
    vi.mocked(isSurahDownloaded).mockReturnValueOnce(new Promise((r) => { resolve = r })).mockResolvedValue(false)
    const { rerender } = render(<QuranOfflinePlayer {...props} />)
    rerender(<QuranOfflinePlayer {...props} surahNumber={2} />)
    resolve(true)
    await waitFor(() => expect(isSurahDownloaded).toHaveBeenCalledWith('ar.minshawi', 2))
    expect(screen.queryByTestId('quran-offline-player')).toBeNull()
  })
})
