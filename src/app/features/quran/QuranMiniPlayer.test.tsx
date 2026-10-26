import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QuranMiniPlayer } from './QuranMiniPlayer'
import { toArabicNumber } from '../../constants'
import { useQuranAudio } from './QuranAudioProvider'
vi.mock('./QuranAudioProvider', () => ({ useQuranAudio: vi.fn() }))
const mockedUseQuranAudio = vi.mocked(useQuranAudio)
function mockAudio() { return { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn() } as unknown as HTMLAudioElement }
const value = (overrides: Partial<ReturnType<typeof useQuranAudio>>) => ({
  reciter: 'ar.minshawi' as const, current: 3, currentSurah: 1, playing: true, buffering: false,
  audioProgress: 0, audioDuration: 10, playback: null, audio: mockAudio(),
  playSingleAyah: vi.fn(), playConnected: vi.fn(), toggleCurrent: vi.fn(), toggle: vi.fn(), stop: vi.fn(),
  repeat: 'off' as const, setRepeat: vi.fn(), selectAyah: vi.fn(), setReciter: vi.fn(), ...overrides,
})
describe('QuranMiniPlayer', () => {
  beforeEach(() => vi.clearAllMocks())
  it('appears while an active audio session exists', () => {
    mockedUseQuranAudio.mockReturnValue(value({}))
    render(<QuranMiniPlayer />)
    expect(screen.getByTestId('quran-mini-player')).toBeTruthy()
    expect(screen.getByText('محمد صديق المنشاوي')).toBeTruthy()
    expect(screen.getByText(/الآية/)).toBeTruthy()
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

  it('labels connected playback as continuous recitation', () => {
    mockedUseQuranAudio.mockReturnValue(value({ current: null, playback: { kind: 'connected', reciter: 'ar.minshawi', surahNumber: 1, source: 'https://server10.mp3quran.net/minsh/001.mp3' } }))
    render(<QuranMiniPlayer />)
    expect(screen.getByText(/تلاوة متصلة/)).toBeTruthy()
  })
  it('switches reciter from the mini player', () => {
    const setReciter = vi.fn()
    mockedUseQuranAudio.mockReturnValue(value({ setReciter }))
    render(<QuranMiniPlayer />)
    fireEvent.change(screen.getByRole('combobox', { name: 'القارئ في المشغل المصغر' }), { target: { value: 'ar.alafasy' } })
    expect(setReciter).toHaveBeenCalledWith('ar.alafasy')
  })

  it('starts at the top and can be dragged', () => {
    mockedUseQuranAudio.mockReturnValue(value({}))
    render(<QuranMiniPlayer />)
    const player = screen.getByTestId('quran-mini-player')
    expect(player).toHaveStyle({ top: '16px', left: '50%' })
    fireEvent.pointerDown(player, { pointerId: 1, clientX: 100, clientY: 30 })
    fireEvent.pointerMove(player, { pointerId: 1, clientX: 180, clientY: 120 })
    fireEvent.pointerUp(player, { pointerId: 1, clientX: 180, clientY: 120 })
    expect(player).toHaveStyle({ top: '90px', left: '80px' })
  })

  it('closes the mini player by stopping the active audio session', () => {
    const stop = vi.fn()
    mockedUseQuranAudio.mockReturnValue(value({ stop }))
    render(<QuranMiniPlayer />)
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق مشغل القرآن المصغر' }))
    expect(stop).toHaveBeenCalledTimes(1)
  })

})
