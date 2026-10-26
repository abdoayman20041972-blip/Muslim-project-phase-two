import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QURAN_AUDIO_RECITERS } from '../../quran/quranAudioPlayback'
import { QuranSection } from './QuranSection'

const mocks = vi.hoisted(() => ({
  getDownloadStatus: vi.fn(),
  downloadSurah: vi.fn(),
  downloadReciterAll: vi.fn(),
  deleteSurah: vi.fn(),
  deleteReciterAll: vi.fn(),
}))

vi.mock('../../quran/offlineDownload', () => mocks)

vi.mock('../settingsPrimitives', () => ({
  Section: ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2>{title}</h2>{children}</section>,
  Row: ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => <div><span>{title}</span>{description && <span>{description}</span>}{children}</div>,
  Choice: ({ labels }: { labels: Record<string, string> }) => <div>{Object.values(labels).map((v) => <span key={v}>{v}</span>)}</div>,
}))

const props = {
  fontSize: 'md' as const,
  setFontSize: vi.fn(),
  reciter: QURAN_AUDIO_RECITERS[0],
  setReciter: vi.fn(),
  layout: 'scroll' as const,
  setLayout: vi.fn(),
  tafsir: 'muyassar',
  setTafsir: vi.fn(),
  save: vi.fn(),
}

describe('QuranSection offline downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders undownloaded, downloading, and completed states correctly', async () => {
    mocks.getDownloadStatus.mockImplementation(async (id: string) => ({
      completed: id === 'ar.alafasy' ? [1, 2] : id === 'ar.husary' ? Array.from({ length: 114 }, (_, i) => i + 1) : [],
      total: 114,
    }))
    render(<QuranSection {...props} />)
    await waitFor(() => screen.getAllByText('عرض السور (114)'))
    expect(screen.getByText('مكتمل')).toBeTruthy()
    expect(screen.getByText('تنزيل جزئي')).toBeTruthy()
    expect(screen.getAllByText('تنزيل القارئ كاملًا').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByText('عرض السور (114)')[1])
    await waitFor(() => expect(screen.getAllByText('منزّلة').length).toBeGreaterThan(0))
    expect(screen.getAllByText('غير منزّلة').length).toBeGreaterThan(0)
    expect(screen.getByText('استكمال')).toBeTruthy()
    expect(screen.getByText('حذف القارئ كاملًا')).toBeTruthy()
  })

  it('shows a real in-progress state while a surah download is pending', async () => {
    mocks.getDownloadStatus.mockResolvedValue({ completed: [], total: 114 })
    let resolveDownload!: () => void
    mocks.downloadSurah.mockImplementation(() => new Promise<void>((resolve) => { resolveDownload = resolve }))
    render(<QuranSection {...props} />)
    await waitFor(() => screen.getAllByText('عرض السور (114)'))
    fireEvent.click(screen.getAllByText('عرض السور (114)')[0])
    fireEvent.click(screen.getAllByText('تنزيل')[0])
    await waitFor(() => expect(screen.getAllByText('جاري التنزيل…').length).toBeGreaterThan(0))
    resolveDownload()
    await waitFor(() => expect(mocks.downloadSurah).toHaveBeenCalled())
  })

  it('downloads one surah with the correct arguments', async () => {
    mocks.getDownloadStatus.mockResolvedValue({ completed: [], total: 114 })
    mocks.downloadSurah.mockResolvedValue(undefined)
    render(<QuranSection {...props} />)
    await waitFor(() => screen.getAllByText('عرض السور (114)'))
    fireEvent.click(screen.getAllByText('عرض السور (114)')[0])
    fireEvent.click(screen.getAllByText('تنزيل')[0])
    await waitFor(() => expect(mocks.downloadSurah).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0], 1))
  })

  it('deletes one surah and uses the reciter delete for the full library', async () => {
    mocks.getDownloadStatus.mockImplementation(async (id: string) => ({
      completed: id === QURAN_AUDIO_RECITERS[0] ? [1] : Array.from({ length: 114 }, (_, i) => i + 1),
      total: 114,
    }))
    mocks.deleteSurah.mockResolvedValue(undefined)
    mocks.deleteReciterAll.mockResolvedValue(undefined)
    render(<QuranSection {...props} />)
    await waitFor(() => screen.getByText('استكمال'))
    fireEvent.click(screen.getAllByText('عرض السور (114)')[0])
    fireEvent.click(screen.getAllByText('حذف')[0])
    await waitFor(() => expect(mocks.deleteSurah).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0], 1))
    fireEvent.click(screen.getAllByText('حذف القارئ كاملًا')[0])
    await waitFor(() => expect(mocks.deleteReciterAll).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[1]))
  })
})
