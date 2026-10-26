import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuranAudioProvider, useQuranAudio } from './QuranAudioProvider'
import { APP_SETTINGS_KEYS } from '../../settings'
import { loadSurah } from './loadSurah'

vi.mock('./loadSurah', () => ({ loadSurah: vi.fn() }))

const audioInstances: MockAudio[] = []

class MockAudio extends EventTarget {
  src = ''
  duration = 120
  currentTime = 0
  readyState = 0
  preload = ''
  play = vi.fn(async () => { this.dispatchEvent(new Event('playing')) })
  pause = vi.fn()
  constructor(url = '') { super(); this.src = url; audioInstances.push(this) }
}

function Consumer() {
  const audio = useQuranAudio()
  return (
    <>
      <span data-testid="current">{audio.current ?? 'none'}</span>
      <span data-testid="playing">{String(audio.playing)}</span>
      <button onClick={() => audio.playSingleAyah({ number: 7, numberInSurah: 7, text: 'آية' }, 'ar.minshawi', 2)}>play</button>
      <button onClick={audio.stop}>stop</button>
    </>
  )
}

describe('QuranAudioProvider', () => {
  beforeEach(() => {
    audioInstances.length = 0
    localStorage.clear()
    vi.mocked(loadSurah).mockReset()
    vi.stubGlobal('Audio', MockAudio)
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { metadata: null, playbackState: 'none', setActionHandler: vi.fn() },
    })
  })

  it('keeps playback state when the consumer mounts and unmounts', async () => {
    function Harness({ visible }: { visible: boolean }) { return visible ? <Consumer /> : null }
    const view = vi.fn()
    const { rerender } = render(<QuranAudioProvider setView={view}><Harness visible /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play' })))
    expect(screen.getByTestId('current')).toHaveTextContent('7')
    expect(screen.getByTestId('playing')).toHaveTextContent('true')
    rerender(<QuranAudioProvider setView={view}><Harness visible={false} /></QuranAudioProvider>)
    rerender(<QuranAudioProvider setView={view}><Harness visible /></QuranAudioProvider>)
    expect(screen.getByTestId('current')).toHaveTextContent('7')
    expect(screen.getByTestId('playing')).toHaveTextContent('true')
  })

  it('uses one complete surah audio file for connected playback', async () => {
    const view = vi.fn()
    function Harness() { const audio = useQuranAudio(); return <><span data-testid="cc">{audio.current ?? 'none'}</span><span data-testid="cp">{String(audio.playing)}</span><button onClick={() => audio.playConnected(0, [{ number: 101, numberInSurah: 1, text: 'الأولى' }, { number: 102, numberInSurah: 2, text: 'الثانية' }], 'ar.minshawi', 114)}>play connected</button></> }
    render(<QuranAudioProvider setView={view}><Harness /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play connected' })))
    expect(audioInstances).toHaveLength(1)
    expect(audioInstances[0].src).toContain('/114.mp3')
    expect(screen.getByTestId('cc')).toHaveTextContent('none')
    await act(async () => audioInstances[0].dispatchEvent(new Event('ended')))
    expect(screen.getByTestId('cp')).toHaveTextContent('false')
    expect(view).not.toHaveBeenCalled()
  })

  it.each([['off', 1], ['ayah', 1], ['surah', 2]] as const)('handles repeat mode %s for complete-surah playback', async (repeat, expectedInstances) => {
    const view = vi.fn()
    function Harness() {
      const audio = useQuranAudio()
      return <><span data-testid="rc">{audio.current ?? 'none'}</span><button onClick={() => audio.setRepeat(repeat)}>repeat</button><button onClick={() => audio.playConnected(0, [{ number: 201, numberInSurah: 1, text: 'الأولى' }], 'ar.minshawi', 114)}>play connected</button></>
    }
    render(<QuranAudioProvider setView={view}><Harness /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'repeat' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play connected' })))
    await act(async () => audioInstances[0].dispatchEvent(new Event('ended')))
    expect(audioInstances).toHaveLength(expectedInstances)
    expect(screen.getByTestId('rc')).toHaveTextContent('none')
    expect(view).not.toHaveBeenCalled()
  })

  it('switches an active single-ayah session at the same ayah after preloading the new reciter', async () => {
    const view = vi.fn()
    function Harness() {
      const audio = useQuranAudio()
      return <><span data-testid="switch-current">{audio.current ?? 'none'}</span><button onClick={() => audio.playSingleAyah({ number: 707, numberInSurah: 7, text: 'آية' }, 'ar.minshawi', 2)}>start</button><button onClick={() => void audio.setReciter('ar.alafasy')}>switch</button></>
    }
    render(<QuranAudioProvider setView={view}><Harness /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'start' })))
    const oldAudio = audioInstances[0]
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'switch' })))
    const switchedAudio = audioInstances[audioInstances.length - 1]
    expect(switchedAudio.src).toContain('/ar.alafasy/707.mp3')
    await act(async () => switchedAudio.dispatchEvent(new Event('canplaythrough')))
    expect(oldAudio.pause).toHaveBeenCalled()
    expect(audioInstances[1].src).toContain('/ar.alafasy/707.mp3')
    expect(screen.getByTestId('switch-current')).toHaveTextContent('7')
  })

  it('continues connected playback with the new reciter after switching', async () => {
    const view = vi.fn()
    function Harness() {
      const audio = useQuranAudio()
      return <><span data-testid="connected-switch-current">{audio.current ?? 'none'}</span><button onClick={() => audio.playConnected(0, [{ number: 801, numberInSurah: 1, text: 'الأولى' }, { number: 802, numberInSurah: 2, text: 'الثانية' }], 'ar.minshawi', 114)}>start</button><button onClick={() => void audio.setReciter('ar.husary')}>switch</button></>
    }
    render(<QuranAudioProvider setView={view}><Harness /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'start' })))
    const oldAudio = audioInstances[0]
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'switch' })))
    expect(oldAudio.pause).not.toHaveBeenCalled()
    const switchedPreload = audioInstances[audioInstances.length - 1]
    await act(async () => switchedPreload.dispatchEvent(new Event('canplaythrough')))
    expect(audioInstances.some((item) => item.src.includes('server13.mp3quran.net/husr/114.mp3'))).toBe(true)
    expect(audioInstances.some((item) => item.src.includes('server13.mp3quran.net/husr/114.mp3'))).toBe(true)
  })

  it('does not expose misleading previous and next track actions for complete-surah playback', async () => {
    const view = vi.fn()
    function Harness() {
      const audio = useQuranAudio()
      return <button onClick={() => audio.playConnected(1, [{ number: 901, numberInSurah: 1, text: 'الأولى' }, { number: 902, numberInSurah: 2, text: 'الثانية' }, { number: 903, numberInSurah: 3, text: 'الثالثة' }], 'ar.minshawi', 114)}>start</button>
    }
    render(<QuranAudioProvider setView={view}><Harness /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'start' })))
    const calls = (navigator.mediaSession.setActionHandler as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.find(([action]) => action === 'previoustrack')?.[1]).toBeUndefined()
    expect(calls.find(([action]) => action === 'nexttrack')?.[1]).toBeUndefined()
  })

  it('updates playbackState and clears Media Session on unmount', async () => {
    const view = vi.fn()
    const { unmount } = render(<QuranAudioProvider setView={view}><Consumer /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play' })))
    expect(navigator.mediaSession.playbackState).toBe('playing')
    unmount()
    expect(navigator.mediaSession.playbackState).toBe('none')
    expect(navigator.mediaSession.metadata).toBeNull()
  })

  it('supports basic play and pause through the provider', async () => {
    const view = vi.fn()
    render(<QuranAudioProvider setView={view}><Consumer /></QuranAudioProvider>)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play' })))
    expect(screen.getByTestId('playing')).toHaveTextContent('true')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'stop' })))
    expect(screen.getByTestId('playing')).toHaveTextContent('false')
  })

  it('registers Media Session play and pause handlers', async () => {
    const view = vi.fn()
    render(<QuranAudioProvider setView={view}><Consumer /></QuranAudioProvider>)
    const calls = (navigator.mediaSession.setActionHandler as ReturnType<typeof vi.fn>).mock.calls
    const pauseHandler = calls.find(([action]) => action === 'pause')?.[1] as (() => void) | undefined
    expect(pauseHandler).toEqual(expect.any(Function))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'play' })))
    await act(async () => pauseHandler?.())
    expect(screen.getByTestId('playing')).toHaveTextContent('false')
  })
})
