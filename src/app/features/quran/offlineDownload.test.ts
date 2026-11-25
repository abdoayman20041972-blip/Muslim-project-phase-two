import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelDownload,
  deleteReciterAll,
  deleteSurah,
  downloadReciterAll,
  downloadSurah,
  getDownloadJobs,
  getDownloadStatus,
  getDownloadedSurahBlob,
  getReciterStorageBytes,
  isSurahDownloaded,
  pauseDownload,
  resumeDownload,
  retryFailedDownloads,
  subscribeToDownloadJobs,
  type DownloadJobSnapshot,
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

  transaction(_names: string | string[]) {
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

const ID3 = [0x49, 0x44, 0x33]

function audioChunk(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  bytes[0] = ID3[0]
  bytes[1] = ID3[1]
  bytes[2] = ID3[2]
  return bytes
}

type StreamOptions = {
  contentType?: string
  declaredLength?: number
}

function streamResponse(chunks: Uint8Array[], options?: StreamOptions) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return options?.contentType ?? 'audio/mpeg'
        if (name === 'content-length') return String(options?.declaredLength ?? total)
        return null
      },
    },
    body: {
      getReader: () => {
        let index = 0
        return {
          read: async () =>
            index < chunks.length
              ? { done: false, value: chunks[index++] }
              : { done: true, value: undefined },
        }
      },
    },
  } as unknown as Response
}

let hangingInit: RequestInit | undefined

/** A response whose body never delivers bytes and rejects on abort. */
function hangingResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: {
      getReader: () => ({
        read: () =>
          new Promise((_, reject) => {
            const signal = (hangingInit?.signal ?? null) as AbortSignal | null
            signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          }),
      }),
    },
  } as unknown as Response
}

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
    vi.fn().mockResolvedValue(streamResponse([audioChunk(64 * 1024)])),
  )
})

afterEach(() => {
  for (const job of getDownloadJobs()) cancelDownload(job.reciter)
  vi.restoreAllMocks()
  indexedDb.deleteDatabase()
})

describe('Quran offline download manager', () => {
  it('downloads one surah, validates it, and records size and status', async () => {
    const result = await downloadSurah('ar.minshawi', 1)

    expect(result.status).toBe('completed')
    expect(await isSurahDownloaded('ar.minshawi', 1)).toBe(true)
    expect(await getDownloadedSurahBlob('ar.minshawi', 1)).toBeInstanceOf(Blob)
    expect(await getDownloadStatus('ar.minshawi')).toEqual({ completed: [1], failed: [], total: 114 })
    expect(await getReciterStorageBytes('ar.minshawi')).toBe(64 * 1024)
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

  it('returns the live job when the same reciter download starts twice in quick succession', async () => {
    const fetchMock = vi.mocked(fetch)
    let calls = 0
    fetchMock.mockImplementation(async () => {
      calls += 1
      return streamResponse([audioChunk(64 * 1024)])
    })

    // Both calls pass their first jobs.get check before either reaches startJob.
    const [first, second] = await Promise.all([
      downloadReciterAll('ar.minshawi'),
      downloadReciterAll('ar.minshawi'),
    ])

    expect(first.status).toBe('completed')
    expect(second.status).toBe('completed')
    expect(calls).toBe(114)
    expect((await getDownloadStatus('ar.minshawi')).completed).toHaveLength(114)
  })

  it('does not leave a surah stored when the library is deleted mid-download', async () => {
    const fetchMock = vi.mocked(fetch)
    let releaseFetch: ((value: Response) => void) | undefined
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => { releaseFetch = resolve }),
    )

    const jobPromise = downloadReciterAll('ar.minshawi')
    await vi.waitFor(() => expect(releaseFetch).toBeDefined())

    // Delete while the first surah's fetch is suspended; the blob arrives only
    // after the delete has started.
    const deletePromise = deleteReciterAll('ar.minshawi')
    releaseFetch!(streamResponse([audioChunk(64 * 1024)]))
    await Promise.all([jobPromise, deletePromise])

    expect((await getDownloadStatus('ar.minshawi')).completed).toEqual([])
    expect(await isSurahDownloaded('ar.minshawi', 1)).toBe(false)
  })

  it('isolates a repeated network failure to one surah and summarizes it by name', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith('/002.mp3')) throw new TypeError('offline')
      return streamResponse([audioChunk(64 * 1024)])
    })

    const result = await downloadReciterAll('ar.minshawi')

    expect(result.status).toBe('completed')
    expect(result.failed).toEqual([{ surahNumber: 2, reason: 'network' }])
    const status = await getDownloadStatus('ar.minshawi')
    expect(status.completed).toHaveLength(113)
    expect(status.failed).toEqual([{ surahNumber: 2, reason: 'network' }])
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/002.mp3'))).toHaveLength(3)
  })

  it('does not report a download complete when the stored copy is shorter than what was received', async () => {
    const realPut = FakeStore.prototype.put
    vi.spyOn(FakeStore.prototype, 'put').mockImplementation(function (this: FakeStore, value: RecordValue) {
      return realPut.call(this, value.blob instanceof Blob ? { ...value, blob: new Blob([new Uint8Array(10)]) } : value)
    })

    const result = await downloadSurah('ar.minshawi', 7)

    expect(result.failed).toEqual([{ surahNumber: 7, reason: 'storage' }])
    expect(await isSurahDownloaded('ar.minshawi', 7)).toBe(false)
    expect(await getDownloadedSurahBlob('ar.minshawi', 7)).toBeUndefined()
  })

  it('rejects an HTML error page even with HTTP 200', async () => {
    const html = new TextEncoder().encode('<html><body>Not Found</body></html>')
    vi.mocked(fetch).mockResolvedValue(
      streamResponse([html], { contentType: 'text/html', declaredLength: html.byteLength }),
    )

    const result = await downloadSurah('ar.minshawi', 5)

    expect(result.status).toBe('completed')
    expect(result.failed).toEqual([{ surahNumber: 5, reason: 'invalid-content' }])
    expect(await isSurahDownloaded('ar.minshawi', 5)).toBe(false)
    expect(await getDownloadedSurahBlob('ar.minshawi', 5)).toBeUndefined()
  })

  it('accepts an MP3 that starts with zero padding before the first frame (Abdul Basit files)', async () => {
    const body = audioChunk(64 * 1024)
    const padded = new Uint8Array(208 + body.byteLength)
    padded.set(body, 208) // 208 zero bytes, then a valid frame sync
    // Split so the first network chunk is ONLY padding.
    vi.mocked(fetch).mockResolvedValue(streamResponse([padded.subarray(0, 100), padded.subarray(100)], { declaredLength: padded.byteLength }))

    const result = await downloadSurah('ar.abdulbasitmurattal', 112)

    expect(result.failed).toEqual([])
    expect(await isSurahDownloaded('ar.abdulbasitmurattal', 112)).toBe(true)
  })

  it('rejects audio-looking bytes that are not MP3 and truncated bodies', async () => {
    const notMp3 = new Uint8Array(64 * 1024) // zeros: no ID3, no frame sync
    vi.mocked(fetch).mockResolvedValueOnce(streamResponse([notMp3]))
    let result = await downloadSurah('ar.minshawi', 7)
    expect(result.failed).toEqual([{ surahNumber: 7, reason: 'invalid-content' }])

    vi.mocked(fetch).mockImplementation(async () =>
      streamResponse([audioChunk(64 * 1024)], { declaredLength: 128 * 1024 }),
    )
    result = await downloadSurah('ar.minshawi', 8)
    expect(result.failed).toEqual([{ surahNumber: 8, reason: 'truncated' }])
    expect(await isSurahDownloaded('ar.minshawi', 8)).toBe(false)
  })

  it('pauses mid-surah, clears the transient status, and resumes from that surah', async () => {
    await downloadSurah('ar.minshawi', 1)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (_input, init) => {
      hangingInit = init
      return hangingResponse()
    })

    const promise = downloadReciterAll('ar.minshawi')
    await vi.waitFor(() => expect(getDownloadJobs()[0]?.state).toBe('running'))
    await vi.waitFor(() => expect(getDownloadJobs()[0]?.current?.surahNumber).toBe(2))

    pauseDownload('ar.minshawi')
    const result = await promise

    expect(result.status).toBe('paused')
    expect(await isSurahDownloaded('ar.minshawi', 2)).toBe(false)
    expect((await getDownloadStatus('ar.minshawi')).failed).toEqual([])
    expect(getDownloadJobs()[0]?.state).toBe('paused')

    fetchMock.mockImplementation(async () => streamResponse([audioChunk(64 * 1024)]))
    const resumed = resumeDownload('ar.minshawi')
    expect(resumed).toBeDefined()
    await resumed!

    expect((await getDownloadStatus('ar.minshawi')).completed).toHaveLength(114)
    expect(getDownloadJobs()).toEqual([])
  })

  it('cancels a running job and leaves no half-downloaded surah behind', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (_input, init) => {
      hangingInit = init
      return hangingResponse()
    })

    const promise = downloadReciterAll('ar.alafasy')
    await vi.waitFor(() => expect(getDownloadJobs()[0]?.current?.surahNumber).toBe(1))

    cancelDownload('ar.alafasy')
    const result = await promise

    expect(result.status).toBe('cancelled')
    expect(getDownloadJobs()).toEqual([])
    const status = await getDownloadStatus('ar.alafasy')
    expect(status.completed).toEqual([])
    expect(status.failed).toEqual([])
    expect(fetchMock).toHaveBeenCalled()
  })

  it('retries only the failed surahs', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith('/003.mp3') || String(input).endsWith('/005.mp3')) throw new TypeError('offline')
      return streamResponse([audioChunk(64 * 1024)])
    })
    await downloadReciterAll('ar.minshawi')

    fetchMock.mockClear()
    fetchMock.mockImplementation(async () => streamResponse([audioChunk(64 * 1024)]))
    const result = await retryFailedDownloads('ar.minshawi')

    expect(result?.status).toBe('completed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((await getDownloadStatus('ar.minshawi')).failed).toEqual([])
    expect((await getDownloadStatus('ar.minshawi')).completed).toHaveLength(114)
  })

  it('limits global concurrency to two fetches across reciters', async () => {
    let current = 0
    let maxConcurrent = 0
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async () => {
      current += 1
      maxConcurrent = Math.max(maxConcurrent, current)
      await new Promise((resolve) => setTimeout(resolve, 5))
      current -= 1
      return streamResponse([audioChunk(64 * 1024)])
    })

    await Promise.all([downloadReciterAll('ar.minshawi'), downloadReciterAll('ar.alafasy')])

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBeGreaterThan(0)
  })

  it('emits job snapshots with byte progress to subscribers', async () => {
    const snapshots: DownloadJobSnapshot[][] = []
    const unsubscribe = subscribeToDownloadJobs((next) => snapshots.push(next))
    const chunks = [audioChunk(32 * 1024), audioChunk(32 * 1024)]
    const total = 64 * 1024
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name === 'content-type' ? 'audio/mpeg' : name === 'content-length' ? String(total) : null,
      },
      body: {
        getReader: () => {
          let index = 0
          return {
            read: async () => {
              // Leave a real gap between chunks so throttled progress emits land.
              await new Promise((resolve) => setTimeout(resolve, 250))
              return index < chunks.length
                ? { done: false, value: chunks[index++] }
                : { done: true, value: undefined }
            },
          }
        },
      },
    } as unknown as Response)

    await downloadSurah('ar.minshawi', 1)
    unsubscribe()

    const running = snapshots.flat().filter((snap) => snap.current)
    expect(running.length).toBeGreaterThan(0)
    expect(Math.max(...running.map((snap) => snap.current!.receivedBytes))).toBe(64 * 1024)
    expect(snapshots.at(-1)).toEqual([])
  })

  it('downloads on any connection, including cellular or an unknown type', async () => {
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockResolvedValue(true), estimate: vi.fn().mockResolvedValue({}) },
      connection: { type: 'cellular' },
    })

    const result = await downloadReciterAll('ar.minshawi')

    expect(result.status).toBe('completed')
    expect(vi.mocked(fetch)).toHaveBeenCalled()
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
