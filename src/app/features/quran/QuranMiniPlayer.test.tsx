import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QuranMiniPlayer } from './QuranMiniPlayer'
import { useQuranAudio } from './QuranAudioProvider'
vi.mock('./QuranAudioProvider', () => ({ useQuranAudio: vi.fn() }))
const mockedUseQuranAudio = vi.mocked(useQuranAudio)
function mockAudio() { return { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn() } as unknown as HTMLAudioElement }
const value = (overrides: Partial<ReturnType<typeof useQuranAudio>>) => ({
  reciter: 'ar.minshawi' as const, current: 3, currentSurah: 1, playing: true, buffering: false,
  audioProgress: 0, audioDuration: 10, playback: null, audio: mockAudio(),
  playSingleAyah: vi.fn(), playConnected: vi.fn(), toggleCurrent: vi.fn(), toggle: vi.fn(), stop: vi.fn(),
  source: null, error: null, backgroundWarning: null, saved: null, restore: vi.fn(), retry: vi.fn(),
  repeat: 'off' as const, setRepeat: vi.fn(), selectAyah: vi.fn(), setReciter: vi.fn(),
  startMemorize: vi.fn(), memorize: null, ...overrides,
})
describe('QuranMiniPlayer', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.removeItem('azkar_hide_mini_player') })
  it('appears while an active audio session exists', () => {
    mockedUseQuranAudio.mockReturnValue(value({}))
    render(<QuranMiniPlayer />)
    expect(screen.getByTestId('quran-mini-player')).toBeTruthy()
    expect(screen.getByText('محمد صديق المنشاوي')).toBeTruthy()
    expect(screen.getByText(/الآية/)).toBeTruthy()
  })
  it('hides the floating player when the setting is on, and shows it again when off', () => {
    mockedUseQuranAudio.mockReturnValue(value({}))
    localStorage.setItem('azkar_hide_mini_player', '1')
    const { unmount } = render(<QuranMiniPlayer />)
    expect(screen.queryByTestId('quran-mini-player')).toBeNull()
    unmount()
    localStorage.setItem('azkar_hide_mini_player', '0')
    render(<QuranMiniPlayer />)
    expect(screen.getByTestId('quran-mini-player')).toBeTruthy()
  })
  it('keeps the resume-listening bar when the floating player is hidden', () => {
    mockedUseQuranAudio.mockReturnValue(value({ current: null, currentSurah: null, playing: false, audio: null, saved: { surah: 1, reciter: 'ar.minshawi', seconds: 5 } as never }))
    localStorage.setItem('azkar_hide_mini_player', '1')
    render(<QuranMiniPlayer />)
    expect(screen.getByTestId('quran-resume-player')).toBeTruthy()
    localStorage.removeItem('azkar_hide_mini_player')
  })
  it('does not render when there is no active audio session', () => {
    mockedUseQuranAudio.mockReturnValue(value({ current: null, currentSurah: null, playing: false, audio: null }))
    render(<QuranMiniPlayer />)
    expect(screen.queryByTestId('quran-mini-player')).toBeNull()
  })
  it('uses the shared playback toggle for play/pause', () => {
        const toggleCurrent = vi.fn()
        mockedUseQuranAudio.mockReturnValue(value({ playing: false, toggleCurrent }))
        render(<QuranMiniPlayer />)
        fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))
        expect(toggleCurrent).toHaveBeenCalledTimes(1)
  })

  it('labels the toggle as skip during a memorization silence window', () => {
        const toggleCurrent = vi.fn()
        mockedUseQuranAudio.mockReturnValue(value({
          playing: true, toggleCurrent,
          memorize: { surah: 1, reciter: 'ar.minshawi', from: 1, to: 3, ayah: 2, repeats: 5, done: 1, gap: true, gapMs: 1000, status: 'playing', complete: false },
        }))
        render(<QuranMiniPlayer />)
        const button = screen.getByRole('button', { name: 'تخطي الفاصل' })
        expect(button).toBeTruthy()
        expect(screen.getByText(/فاصل صمت بين التكرارات/)).toBeTruthy()
        fireEvent.click(button)
        expect(toggleCurrent).toHaveBeenCalledTimes(1)
  })

  it('labels connected playback as continuous recitation', () => {
    mockedUseQuranAudio.mockReturnValue(value({ current: null, playback: { kind: 'connected', reciter: 'ar.minshawi',  } }))
    render(<QuranMiniPlayer />)
    expect(screen.getByText(/تلاوة متصلة/)).toBeTruthy()
  })
  it('switches reciter from the app-styled list, not a system dropdown', () => {
    const setReciter = vi.fn()
    mockedUseQuranAudio.mockReturnValue(value({ setReciter }))
    render(<QuranMiniPlayer />)
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'القارئ في المشغل المصغر' }))
    fireEvent.click(screen.getByRole('option', { name: 'مشاري العفاسي' }))
    expect(setReciter).toHaveBeenCalledWith('ar.alafasy')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is docked to the bottom edge by stylesheet and cannot be dragged to the middle', () => {
    mockedUseQuranAudio.mockReturnValue(value({}))
    render(<QuranMiniPlayer />)
    const player = screen.getByTestId('quran-mini-player')
    expect(player.className).toContain('quran-mini-player')
    fireEvent.pointerDown(player, { pointerId: 1, clientX: 100, clientY: 30 })
    fireEvent.pointerMove(player, { pointerId: 1, clientX: 180, clientY: 120 })
    expect(player.style.top).toBe('')
  })

  it('closes the mini player by stopping the active audio session', () => {
    const stop = vi.fn()
    mockedUseQuranAudio.mockReturnValue(value({ stop }))
    render(<QuranMiniPlayer />)
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق مشغل القرآن المصغر' }))
    expect(stop).toHaveBeenCalledTimes(1)
  })

})
