import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuranOfflinePlayer } from './QuranOfflinePlayer'

const mocks = vi.hoisted(() => ({ isSurahDownloaded: vi.fn(), getDownloadedSurahBlob: vi.fn() }))
vi.mock('./offlineDownload', () => mocks)

describe('QuranOfflinePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.isSurahDownloaded.mockResolvedValue(true); mocks.getDownloadedSurahBlob.mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' }))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:offline-1'), revokeObjectURL: vi.fn() })
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) })
    Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: vi.fn() })
  })
  const props = { reciter: 'ar.minshawi' as const, surahNumber: 1, autoStart: false, onAutoStartConsumed: vi.fn(), onNavigateToSurah: vi.fn() }
  it('plays a stored complete-surah blob through the independent audio element', async () => {
    render(<QuranOfflinePlayer {...props} />); await waitFor(() => screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.click(screen.getByRole('button', { name: 'استماع أوفلاين' }))
    await waitFor(() => expect(mocks.getDownloadedSurahBlob).toHaveBeenCalledWith('ar.minshawi', 1)); expect(URL.createObjectURL).toHaveBeenCalled(); expect(screen.getByTestId('quran-offline-player').querySelector('audio')).toBeTruthy()
  })
  it('moves only to a next surah that is actually downloaded', async () => {
    const onNavigate = vi.fn(); mocks.isSurahDownloaded.mockImplementation(async (_r: string, n: number) => n === 1 || n === 2)
    render(<QuranOfflinePlayer {...props} onNavigateToSurah={onNavigate} />); await waitFor(() => screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.click(screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.ended(screen.getByTestId('quran-offline-player').querySelector('audio')!)
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(2))
  })
  it('stops quietly when the next surah is not available offline', async () => {
    const onNavigate = vi.fn(); mocks.isSurahDownloaded.mockImplementation(async (_r: string, n: number) => n === 1)
    render(<QuranOfflinePlayer {...props} onNavigateToSurah={onNavigate} />); await waitFor(() => screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.click(screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.ended(screen.getByTestId('quran-offline-player').querySelector('audio')!)
    await waitFor(() => expect(onNavigate).not.toHaveBeenCalled())
  })
  it('revokes the object URL when stopped and when leaving the screen', async () => {
    const { unmount } = render(<QuranOfflinePlayer {...props} />); await waitFor(() => screen.getByRole('button', { name: 'استماع أوفلاين' })); fireEvent.click(screen.getByRole('button', { name: 'استماع أوفلاين' })); await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled()); fireEvent.click(screen.getByRole('button', { name: 'إيقاف أوفلاين' })); unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:offline-1')
  })
})