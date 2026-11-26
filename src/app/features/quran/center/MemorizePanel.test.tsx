import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemorizePanel } from './MemorizePanel'
import { useQuranAudio } from '../QuranAudioProvider'
import { countCachedMemorizeAudio } from './memorizeAudioCache'
import type { SurahMeta } from '../../../../quran-meta'

vi.mock('../QuranAudioProvider', () => ({ useQuranAudio: vi.fn() }))
vi.mock('./memorizeAudioCache', () => ({
  countCachedMemorizeAudio: vi.fn(async () => 0),
  registerQuranAudioCache: vi.fn(async () => true),
}))
const mockedUseQuranAudio = vi.mocked(useQuranAudio)
const mockedCountCached = vi.mocked(countCachedMemorizeAudio)

const surah: SurahMeta = { number: 114, name: 'سُورَةُ النَّاسِ', shortName: 'الناس', numberOfAyahs: 6, revelationType: 'Meccan' }
const ayahs = Array.from({ length: 6 }, (_, i) => ({ number: 6231 + i, numberInSurah: i + 1, text: `نص الآية ${i + 1}` }))
const startAyah = ayahs[1]

function mockAudio(overrides: Record<string, unknown> = {}) {
  mockedUseQuranAudio.mockReturnValue({
    startMemorize: vi.fn(),
    memorize: null,
    stop: vi.fn(),
    toggleCurrent: vi.fn(),
    playing: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useQuranAudio>)
}

function renderPanel(overrides: Partial<Parameters<typeof MemorizePanel>[0]> = {}) {
  const onHideTextChange = vi.fn()
  render(
    <MemorizePanel
      surah={surah}
      ayahs={ayahs}
      startAyah={startAyah}
      reciter="ar.minshawi"
      hideText={false}
      onHideTextChange={onHideTextChange}
      {...overrides}
    />,
  )
  return { onHideTextChange }
}

beforeEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); mockedCountCached.mockResolvedValue(0) })

describe('MemorizePanel setup', () => {
  it('starts a drill from the opened ayah with the chosen options', () => {
    const startMemorize = vi.fn()
    mockAudio({ startMemorize })
    renderPanel()
    fireEvent.change(screen.getByLabelText('إلى الآية'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('تكرار كل آية'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('فاصل الصمت'), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ التكرار' }))
    expect(startMemorize).toHaveBeenCalledWith({
      reciter: 'ar.minshawi', surah: 114, from: startAyah, to: 4, repeats: 5, gapMs: 2000,
    })
  })

  it('only offers ayahs from the opened one to the end of the surah', () => {
    mockAudio()
    renderPanel()
    const options = screen.getByLabelText('إلى الآية').querySelectorAll('option')
    expect(options).toHaveLength(5) // ayahs 2..6 of surah 114
  })

  it('reports the hide-text choice upward', () => {
    mockAudio()
    const { onHideTextChange } = renderPanel()
    fireEvent.click(screen.getByLabelText('إخفاء نص الآية أثناء التكرار'))
    expect(onHideTextChange).toHaveBeenCalledWith(true)
  })

  it('states the internet requirement up front', () => {
    mockAudio()
    renderPanel()
    expect(screen.getByText(/أول تشغيل لكل آية يحتاج اتصالًا بالإنترنت/)).toBeTruthy()
  })

  it('blocks the start offline until the range audio is stored locally', async () => {
    const startMemorize = vi.fn()
    mockAudio({ startMemorize })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockedCountCached.mockResolvedValue(0)
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ التكرار' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('لا يوجد اتصال بالإنترنت'))
    expect(startMemorize).not.toHaveBeenCalled()
  })

  it('starts offline when every ayah in the range already has a local copy', async () => {
    const startMemorize = vi.fn()
    mockAudio({ startMemorize })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    mockedCountCached.mockImplementation(async (urls: string[]) => urls.length)
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ التكرار' }))
    await waitFor(() => expect(startMemorize).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('MemorizePanel while a drill runs', () => {
  const running = {
    surah: 114, reciter: 'ar.minshawi' as const, from: 2, to: 4, ayah: 3,
    repeats: 3, done: 1, gap: false, gapMs: 1000, status: 'playing' as const, complete: false,
  }

  it('shows the current ayah and repetition', () => {
    mockAudio({ memorize: running, playing: true })
    renderPanel()
    expect(screen.getByTestId('memorize-progress')).toBeTruthy()
    expect(screen.getByText(/الآية ٣/)).toBeTruthy()
    expect(screen.getByText(/التكرار ٢ من ٣/)).toBeTruthy()
  })

  it('shows an honest loading state instead of a resume label', () => {
    mockAudio({ memorize: { ...running, status: 'loading' }, playing: false })
    renderPanel()
    const button = screen.getByRole('button', { name: 'جارٍ التحميل…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'استئناف' })).toBeNull()
  })

  it('surfaces playback errors inside the panel with retry and end actions', () => {
    const startMemorize = vi.fn()
    const stop = vi.fn()
    mockAudio({ memorize: { ...running, status: 'error' }, error: 'تعذر تشغيل التلاوة.', startMemorize, stop })
    renderPanel()
    expect(screen.getByTestId('memorize-error')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('تعذر تشغيل التلاوة.')
    expect(screen.queryByTestId('memorize-progress')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(startMemorize).toHaveBeenCalledWith({
      reciter: 'ar.minshawi', surah: 114, from: ayahs[1], to: 4, repeats: 3, gapMs: 1000,
    })
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء التكرار' }))
    expect(stop).toHaveBeenCalled()
  })

  it('announces the silence window', () => {
    mockAudio({ memorize: { ...running, gap: true } })
    renderPanel()
    expect(screen.getByText('فاصل صمت…')).toBeTruthy()
  })

  it('labels the toggle as skip during the silence window, not pause', () => {
    mockAudio({ memorize: { ...running, gap: true }, playing: true })
    renderPanel()
    expect(screen.getByRole('button', { name: 'تخطي الفاصل' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'إيقاف مؤقت' })).toBeNull()
  })

  it('reveals the hidden text only on demand and hides it again', () => {
    mockAudio({ memorize: running, playing: true })
    renderPanel({ hideText: true })
    expect(screen.getByText('النص مخفي للاختبار الذاتي')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'إظهار النص مؤقتًا' }))
    expect(screen.getByText('نص الآية 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء النص مجددًا' }))
    expect(screen.getByText('النص مخفي للاختبار الذاتي')).toBeTruthy()
  })

  it('stops the drill from the stop button', () => {
    const stop = vi.fn()
    mockAudio({ memorize: running, playing: true, stop })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء التكرار' }))
    expect(stop).toHaveBeenCalled()
  })

  it('congratulates on completion', () => {
    mockAudio({ memorize: { ...running, ayah: 4, done: 3, complete: true, status: 'paused' } })
    renderPanel()
    expect(screen.getByText(/اكتمل التكرار/)).toBeTruthy()
  })

  it('shows the setup form when the running drill belongs to another surah', () => {
    mockAudio({ memorize: { ...running, surah: 113 } })
    renderPanel()
    expect(screen.getByTestId('memorize-form')).toBeTruthy()
  })
})
