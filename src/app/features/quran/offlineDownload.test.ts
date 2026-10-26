import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteReciterAll,
  deleteSurah,
  downloadReciterAll,
  downloadSurah,
  getDownloadStatus,
  getDownloadedSurahBlob,
  isSurahDownloaded,
} from './offlineDownload'

type RecordValue = Record<string, unknown>

class FakeRequest<T = unknown> {
  result!: T
  error: DOMException | null = null
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null

  succeed(value: T) {
    this.result = value
    queueMicrotask(() => this.onsuccess?.())
  }

  fail(error: DOMException) {
    this.error = error
    queueMicrotask(() => this.onerror?.())
  }
}

class FakeStore {
  constructor(private readonly records: Map<string, RecordValue>) {}

  put(value: RecordValue) {
    const request = new FakeRequest()
    queueMicrotask(() => {
      this.records.set(JSON.stringify([value.reciter, value.surahNumber]), { ...value })
      request.succeed(undefined)
    })
    return request
  }

  get(key: unknown) {
    const request = new FakeRequest<RecordValue | undefined>()
    queueMicrotask(() => request.succeed(this.records.get(JSON.stringify(key)) as RecordValue | undefined))
    return request
  }

  getAll() {
    const request = new FakeRequest<RecordValue[]>()
    queueMicrotask(() => request.succeed([...this.records.values()].map((value) => ({ ...value }))))
    return request
  }

  delete(key: unknown) {
    const request = new FakeRequest()
    queueMicrotask(() => {
      this.records.delete(JSON.stringify(key))
      request.succeed(undefined)
    })
    return request
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor(private readonly stores: Map<string, Map<string, RecordValue>>) {
    setTimeout(() => this.oncomplete?.(), 0)
  }

  objectStore(name: string) {
    return new FakeStore(this.stores.get(name)!)
  }
}

class FakeDb {
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  }

  constructor(private readonly stores: Map<string, Map<string, RecordValue>>) {}

  createObjectStore(name: string) {
    const records = new Map<string, RecordValue>()
    this.stores.set(name, records)
    return new FakeStore(records)
  }

  transaction(names: string | string[]) {
    return new FakeTransaction(this.stores)
  }

  close() {}
}

class FakeIndexedDb {
  private stores = new Map<string, Map<string, RecordValue>>()
  private database = new FakeDb(this.stores)

  open(_name: string, _version: number) {
    const request = new FakeRequest<FakeDb>() as FakeRequest<FakeDb> & {
      onupgradeneeded: (() => void) | null
    }
    request.onupgradeneeded = null
    queueMicrotask(() => {
      request.result = this.database
      request.onupgradeneeded?.()
      request.succeed(this.database)
    })
    return request
  }

  deleteDatabase() {
    this.stores.clear()
    this.database = new FakeDb(this.stores)
    const request = new FakeRequest()
    request.succeed(undefined)
    return request
  }
}

const indexedDb = new FakeIndexedDb()

beforeEach(() => {
  vi.stubGlobal('indexedDB', indexedDb)
  vi.stubGlobal('navigator', {
    storage: {
      persist: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ quota: 10_000_000, usage: 0 }),
    },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      { ok: true, status: 200, blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }) } as unknown as Response,
    ),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  indexedDb.deleteDatabase()
})

describe('Quran offline download engine', () => {
  it('downloads one surah and records it as completed', async () => {
    await downloadSurah('ar.minshawi', 1)

    expect(await isSurahDownloaded('ar.minshawi', 1)).toBe(true)
    expect(await getDownloadedSurahBlob('ar.minshawi', 1)).toBeInstanceOf(Blob)
    expect(await getDownloadStatus('ar.minshawi')).toEqual({ completed: [1], total: 114 })
    expect(navigator.storage.persist).toHaveBeenCalledTimes(1)
  })

  it('resumes a partial reciter download from the first incomplete surah', async () => {
    await downloadSurah('ar.minshawi', 1)
    await downloadSurah('ar.minshawi', 2)

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockClear()

    await downloadReciterAll('ar.minshawi')

    expect(fetchMock).toHaveBeenCalledTimes(112)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/003.mp3')
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('/114.mp3')
    expect((await getDownloadStatus('ar.minshawi')).completed).toHaveLength(114)
  })

  it('isolates a repeated network failure to one surah and continues the reciter queue', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith('/002.mp3')) throw new TypeError('offline')
      return { ok: true, status: 200, blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }) } as unknown as Response
    })

    await downloadReciterAll('ar.minshawi')

    const status = await getDownloadStatus('ar.minshawi')
    expect(status.completed).toHaveLength(113)
    expect(status.completed).not.toContain(2)
    expect(await isSurahDownloaded('ar.minshawi', 1)).toBe(true)
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/002.mp3'))).toHaveLength(3)
  })

  it('deletes a surah and then an entire reciter cleanly', async () => {
    await downloadSurah('ar.minshawi', 1)
    await downloadSurah('ar.minshawi', 2)
    await downloadSurah('ar.alafasy', 1)

    await deleteSurah('ar.minshawi', 1)

    expect(await isSurahDownloaded('ar.minshawi', 1)).toBe(false)
    expect(await isSurahDownloaded('ar.minshawi', 2)).toBe(true)
    expect(await isSurahDownloaded('ar.alafasy', 1)).toBe(true)

    await deleteReciterAll('ar.minshawi')

    expect((await getDownloadStatus('ar.minshawi')).completed).toEqual([])
    expect(await isSurahDownloaded('ar.alafasy', 1)).toBe(true)
  })
})
