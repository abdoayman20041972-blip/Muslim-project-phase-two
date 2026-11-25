import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QURAN_AUDIO_RECITERS } from '../../quran/quranAudioPlayback'
import { QuranSection } from './QuranSection'

const mocks = vi.hoisted(() => ({
  getDownloadStatus: vi.fn(),
  getReciterStorageBytes: vi.fn(async (_id: string) => 0),
  getStorageEstimate: vi.fn(async () => ({ usage: 0, quota: 5_000_000_000 })),
  getStoragePersistence: vi.fn(() => ({ supported: true, granted: true })),
  downloadReciterAll: vi.fn(async () => ({ status: 'completed', completed: [], failed: [] })),
  downloadSurah: vi.fn(async () => ({ status: 'completed', completed: [], failed: [] })),
  retryFailedDownloads: vi.fn(async () => ({ status: 'completed', completed: [], failed: [] })),
  pauseDownload: vi.fn(),
  resumeDownload: vi.fn(),
  cancelDownload: vi.fn(),
  deleteSurah: vi.fn(async () => undefined),
  deleteReciterAll: vi.fn(async () => undefined),
  subscribeToDownloadJobs: vi.fn(),
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

function emitJobs(jobs: unknown[]) {
  const listener = mocks.subscribeToDownloadJobs.mock.calls[0]?.[0] as ((jobs: unknown[]) => void) | undefined
  listener?.(jobs)
}

describe('QuranSection download manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getReciterStorageBytes.mockResolvedValue(0)
    mocks.getStorageEstimate.mockResolvedValue({ usage: 0, quota: 5_000_000_000 })
    mocks.getStoragePersistence.mockReturnValue({ supported: true, granted: true })
    mocks.subscribeToDownloadJobs.mockImplementation((listener: (jobs: unknown[]) => void) => {
      listener([])
      return () => undefined
    })
  })

  it('renders reciter cards with real stored size and failure summary', async () => {
    mocks.getDownloadStatus.mockImplementation(async (id: string) => ({
      completed: id === 'ar.alafasy' ? [1, 2] : id === 'ar.husary' ? Array.from({ length: 114 }, (_, i) => i + 1) : [],
      failed: id === 'ar.alafasy' ? [{ surahNumber: 3, reason: 'network' }] : [],
      total: 114,
    }))
    mocks.getReciterStorageBytes.mockImplementation(async (id: string) => (id === 'ar.alafasy' ? 30 * 1024 * 1024 : 0))

    render(<QuranSection {...props} />)

    await waitFor(() => screen.getByText('مكتمل'))
    expect(screen.getByText('تنزيل جزئي')).toBeTruthy()
    expect(screen.getByText(/المساحة الفعلية/)).toBeTruthy()
    expect(screen.getByText(/فشل ١:/)).toBeTruthy()
    expect(screen.getByText('إعادة الفاشل (١)')).toBeTruthy()
    expect(screen.getByText('حذف القارئ كاملًا')).toBeTruthy()
    expect(screen.getAllByText('التخزين الثابت مفعّل: لن يحذف المتصفح التنزيلات تلقائيًا.').length).toBe(1)
  })

  it('asks for confirmation with size and space, with no Wi-Fi restriction, before a full download', async () => {
    mocks.getDownloadStatus.mockResolvedValue({ completed: [], failed: [], total: 114 })
    render(<QuranSection {...props} />)
    await waitFor(() => screen.getAllByText('تنزيل القارئ كاملًا'))

    fireEvent.click(screen.getAllByText('تنزيل القارئ كاملًا')[0])
    expect(screen.getByText(/تنزيل المكتبة كاملة يستهلك حوالي/)).toBeTruthy()
    expect(screen.getByText(/المتاح التقريبي الآن/)).toBeTruthy()
    expect(screen.queryByText(/Wi-Fi/)).toBeNull()

    fireEvent.click(screen.getByText('بدء التنزيل'))
    await waitFor(() =>
      expect(mocks.downloadReciterAll).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0]),
    )
  })

  it('controls an active job from one place: pause, resume and cancel', async () => {
    mocks.getDownloadStatus.mockResolvedValue({ completed: [1], failed: [], total: 114 })
    mocks.subscribeToDownloadJobs.mockImplementation((listener: (jobs: unknown[]) => void) => {
      listener([{
        reciter: QURAN_AUDIO_RECITERS[0],
        kind: 'reciter',
        state: 'running',
        pendingCount: 113,
        completedCount: 1,
        failed: [],
        current: { surahNumber: 2, receivedBytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024, bytesPerSecond: 1024 * 1024 },
      }])
      return () => undefined
    })

    render(<QuranSection {...props} />)

    await waitFor(() => screen.getByText(/يجري الآن/))
    expect(screen.getByText(/سورة البقرة · ٥٠٪/)).toBeTruthy()
    expect(screen.getByText(/أدرها من الأعلى/)).toBeTruthy()

    fireEvent.click(screen.getByText('إيقاف مؤقت'))
    expect(mocks.pauseDownload).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0])
    fireEvent.click(screen.getByText('إلغاء'))
    expect(mocks.cancelDownload).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0])

    emitJobs([{
      reciter: QURAN_AUDIO_RECITERS[0],
      kind: 'reciter',
      state: 'paused',
      pauseReason: 'user',
      pendingCount: 113,
      completedCount: 1,
      failed: [],
    }])
    await waitFor(() => screen.getByText('استئناف'))
    fireEvent.click(screen.getByText('استئناف'))
    expect(mocks.resumeDownload).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0])
  })

  it('retries only failed surahs from the failure list', async () => {
    mocks.getDownloadStatus.mockImplementation(async (id: string) => ({
      completed: id === QURAN_AUDIO_RECITERS[0] ? [1] : [],
      failed: id === QURAN_AUDIO_RECITERS[0] ? [{ surahNumber: 4, reason: 'truncated' }] : [],
      total: 114,
    }))

    render(<QuranSection {...props} />)
    await waitFor(() => screen.getByText('إعادة الفاشل (١)'))

    fireEvent.click(screen.getByText('إعادة الفاشل (١)'))
    await waitFor(() =>
      expect(mocks.retryFailedDownloads).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0]),
    )
  })

  it('downloads and deletes a single surah from the surah list', async () => {
    mocks.getDownloadStatus.mockImplementation(async (id: string) => ({
      completed: id === QURAN_AUDIO_RECITERS[0] ? [1] : [],
      failed: [],
      total: 114,
    }))

    render(<QuranSection {...props} />)
    await waitFor(() => screen.getAllByText('عرض السور (١١٤)'))
    fireEvent.click(screen.getAllByText('عرض السور (١١٤)')[0])

    await waitFor(() => screen.getByText('منزّلة'))
    fireEvent.click(screen.getByText('حذف'))
    await waitFor(() => expect(mocks.deleteSurah).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0], 1))

    fireEvent.click(screen.getAllByText('تنزيل')[0])
    await waitFor(() => expect(mocks.downloadSurah).toHaveBeenCalledWith(QURAN_AUDIO_RECITERS[0], 2))
  })
})
