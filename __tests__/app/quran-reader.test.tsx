import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QuranReaderView } from '../../src/app/features/quran/QuranReaderView'
import { QuranAudioProvider } from '../../src/app/features/quran/QuranAudioProvider'
import { __resetSurahCacheForTests } from '../../src/app/features/quran/loadSurah'
import type { View } from '../../src/app/constants'

const { toPngMock } = vi.hoisted(() => ({ toPngMock: vi.fn() }))

const view: Extract<View, { name: 'mushaf-surah' }> = { name: 'mushaf-surah', number: 92 }
const localAyahs = Array.from({ length: 21 }, (_, i) => ({
  number: i + 8,
  numberInSurah: i + 1,
  text: i === 0 ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ آية أولى' : 'نص الآية ' + (i + 1),
}))
const quranPages = {
  '593': [
    ...localAyahs.slice(0, 8).map(({ number, numberInSurah }) => ({
      surahNumber: 92,
      numberInSurah,
      number,
    })),
    { surahNumber: 93, numberInSurah: 1, number: 999 },
  ],
  '594': localAyahs.slice(8).map(({ number, numberInSurah }) => ({
    surahNumber: 92,
    numberInSurah,
    number,
  })),
}
const tafsirJson = { tafseer: { id: 'muyassar' }, surah: { number: 2 }, ayah: { ayah: 1, text: 'تفسير تجريبي' } }

vi.mock('html-to-image', () => ({ toPng: toPngMock }))

vi.mock('../../src/app/features/quran/data/quran-uthmani.json', () => ({
  default: { '92': localAyahs },
}))

vi.mock('../../src/app/features/quran/data/quran-pages.json', () => ({
  default: quranPages,
}))

describe('QuranReaderView', () => {
  const renderReader = (view: Parameters<typeof QuranReaderView>[0]['view']) =>
    render(
      <QuranAudioProvider setView={vi.fn()}>
        <QuranReaderView view={view} setView={vi.fn()} />
      </QuranAudioProvider>,
    )

  beforeEach(() => {
    __resetSurahCacheForTests()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    toPngMock.mockReset()
    toPngMock.mockResolvedValue('data:image/png;base64,AAAA')
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    window.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('loads a complete surah and renders its ayahs', async () => {
    renderReader(view)
    await waitFor(() => expect(screen.getByText(/نص الآية 21/)).toBeTruthy())
    expect(screen.getByText('الليل')).toBeTruthy()
  })

  it('paginates by real Mushaf pages and shows the real page number', async () => {
    localStorage.setItem('azkar_reading_layout', 'pages')
    renderReader(view)

    await waitFor(() => expect(screen.getAllByText(/صفحة ٥٩٣/)[0]).toBeTruthy())
    expect(screen.getByText((_, node) => node?.textContent === '١ / ٢ · صفحة ٥٩٣')).toBeTruthy()
    expect(document.querySelectorAll('[data-ayah]').length).toBe(8)
    expect(screen.getByText(/نص الآية 8/)).toBeTruthy()
    expect(screen.queryByText(/نص الآية 9$/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'التالي' }))

    expect(screen.getAllByText(/صفحة ٥٩٤/)[0]).toBeTruthy()
    expect(screen.getByText((_, node) => node?.textContent === '٢ / ٢ · صفحة ٥٩٤')).toBeTruthy()
    expect(document.querySelectorAll('[data-ayah]').length).toBe(13)
    expect(screen.getByText(/نص الآية 21/)).toBeTruthy()
    expect(screen.queryByText(/نص الآية 8$/)).toBeNull()
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled()
  })

  it('keeps shared real pages restricted to the selected surah', async () => {
    localStorage.setItem('azkar_reading_layout', 'pages')
    renderReader(view)

    await waitFor(() => expect(screen.getAllByText(/صفحة ٥٩٣/)[0]).toBeTruthy())
    expect(document.querySelectorAll('[data-ayah]').length).toBe(8)
    expect(screen.queryByText('آية من السورة الأخرى')).toBeNull()
  })

  it('uses the selected page as the initial audio position', async () => {
    localStorage.setItem('azkar_reading_layout', 'pages')
    const AudioMock = vi.fn().mockImplementation(function(){return {src:'',play:vi.fn().mockResolvedValue(undefined),pause:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()}})
    vi.stubGlobal('Audio', AudioMock)
    renderReader(view)
    await waitFor(() => screen.getAllByText(/صفحة ٥٩٣/)[0])
    fireEvent.click(screen.getByRole('button',{name:'التالي'}))
    fireEvent.click(screen.getByRole('button',{name:'تشغيل التلاوة'}))
    expect(AudioMock).toHaveBeenCalled()
  })

  it('positions the ayah toolbar near the pressed ayah and keeps it inside the viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const originalRect = HTMLElement.prototype.getBoundingClientRect
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('data-ayah') === '1') {
        return {
          top: 100,
          bottom: 130,
          left: 0,
          right: 60,
          width: 60,
          height: 30,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        } as DOMRect
      }
      if (this.getAttribute('role') === 'toolbar') {
        return {
          top: 0,
          bottom: 40,
          left: 0,
          right: 220,
          width: 220,
          height: 40,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect
      }
      return originalRect.call(this)
    })

    renderReader(view)
    await waitFor(() => expect(document.querySelector('[data-ayah="1"]')).toBeTruthy())
    fireEvent.click(document.querySelector('[data-ayah="1"]')!)

    const toolbar = await screen.findByRole('toolbar', { name: 'إجراءات الآية ١' })
    expect(toolbar).toHaveStyle({ top: '52px', left: '8px' })
    expect(screen.getAllByRole('button').filter((button) => toolbar.contains(button))).toHaveLength(4)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('toolbar', { name: 'إجراءات الآية ١' })).toBeNull()

    fireEvent.click(document.querySelector('[data-ayah="1"]')!)
    const reopenedToolbar = await screen.findByRole('toolbar', { name: 'إجراءات الآية ١' })
    fireEvent.click(reopenedToolbar.parentElement!)
    expect(screen.queryByRole('toolbar', { name: 'إجراءات الآية ١' })).toBeNull()

    rectSpy.mockRestore()
  })

  it('reads the tafsir text from the live response shape', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>tafsirJson} as Response)
    renderReader(view)
    await waitFor(()=>expect(document.querySelector('[data-ayah="1"]')).toBeTruthy())
    fireEvent.click(document.querySelector('[data-ayah="1"]')!)
    fireEvent.click(screen.getByRole('button',{name:'خيارات الآية ١'}))
    fireEvent.click(screen.getByRole('button',{name:'تفسير الآية'}))
    await waitFor(()=>expect(screen.getByText('تفسير تجريبي')).toBeTruthy())
  })

  it('shares the visible card as a PNG file when Web Share files are supported', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    const canShareMock = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true })
    renderReader(view)
    await waitFor(() => expect(document.querySelector('[data-ayah="1"]')).toBeTruthy())
    fireEvent.click(document.querySelector('[data-ayah="1"]')!)
    fireEvent.click(screen.getByRole('button', { name: 'خيارات الآية ١' }))
    fireEvent.click(screen.getByRole('button', { name: 'مشاركة الآية' }))
    fireEvent.click(screen.getByRole('button', { name: 'مشاركة البطاقة' }))
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1))
    expect(toPngMock).toHaveBeenCalledTimes(1)
    expect(toPngMock.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement)
    expect(canShareMock).toHaveBeenCalledTimes(1)
    const options = shareMock.mock.calls[0][0]
    expect(options.files).toHaveLength(1)
    expect(options.files[0]).toBeInstanceOf(File)
    expect(options.files[0].type).toBe('image/png')
    expect(options.text).toBeUndefined()
    expect(options.title).toBeUndefined()
    expect(toPngMock.mock.calls[0][1]).toMatchObject({
      pixelRatio: 4,
      backgroundColor: expect.any(String),
    })
  })

  it('downloads the PNG when Web Share files are not supported', async () => {
    const canShareMock = vi.fn().mockReturnValue(false)
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true })
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    renderReader(view)
    await waitFor(() => expect(document.querySelector('[data-ayah="1"]')).toBeTruthy())
    fireEvent.click(document.querySelector('[data-ayah="1"]')!)
    fireEvent.click(screen.getByRole('button', { name: 'خيارات الآية ١' }))
    fireEvent.click(screen.getByRole('button', { name: 'مشاركة الآية' }))
    fireEvent.click(screen.getByRole('button', { name: 'مشاركة البطاقة' }))
    await waitFor(() => expect(clickMock).toHaveBeenCalled())
    expect(toPngMock).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    clickMock.mockRestore()
  })

  it('does not persist ayah positions', async () => {
    renderReader(view)
    await waitFor(() => expect(document.querySelector('[data-ayah="1"]')).toBeTruthy())
    const ayahButton = screen.getAllByRole('button').find(b => b.textContent === '١')
    fireEvent.click(ayahButton!)
    expect(localStorage.getItem('azkar_last_ayah')).toBeNull()
    expect(localStorage.getItem('azkar_last_ayah_by_surah')).toBeNull()
  })
})
