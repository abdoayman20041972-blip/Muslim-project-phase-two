import { quranSurahAudioUrl } from '../../constants'
import type { QuranAudioReciter } from './quranAudioPlayback'

const DB_NAME = 'muslim-quran-offline'
const DB_VERSION = 1
const AUDIO_STORE = 'audioFiles'
const STATUS_STORE = 'downloadStatus'
const TOTAL_SURAHS = 114
// One shared pool across every reciter, so two library downloads can never
// multiply connections beyond this limit (issue س12).
const MAX_GLOBAL_CONCURRENCY = 2
const MAX_RETRIES = 2
// One 30s stall budget covers the header wait and the body alike: a response
// that never arrives, trickles, or stops mid-file trips the same watchdog
// (issue ج3).
const BODY_STALL_TIMEOUT_MS = 30_000
// Shortest surahs on MP3Quran still measure tens of KB; anything smaller is
// an error page or a stub, not audio (issue س09).
const MIN_AUDIO_BYTES = 16_384
const PROGRESS_EMIT_MS = 200

export type OfflineDownloadState = 'not-started' | 'downloading' | 'completed' | 'failed'

export type DownloadFailureReason =
  | 'network'
  | 'http'
  | 'invalid-content'
  | 'truncated'
  | 'stalled'
  | 'storage'

export type FailedSurah = {
  surahNumber: number
  reason: DownloadFailureReason
}

export type StatusSummary = {
  completed: number[]
  failed: FailedSurah[]
  total: number
}

export type SurahProgress = {
  surahNumber: number
  receivedBytes: number
  totalBytes?: number
  bytesPerSecond: number
}

export type DownloadJobSnapshot = {
  reciter: QuranAudioReciter
  kind: 'surah' | 'reciter'
  state: 'running' | 'paused'
  pauseReason?: 'user' | 'wifi'
  pendingCount: number
  completedCount: number
  failed: FailedSurah[]
  current?: SurahProgress
}

export type DownloadJobResult = {
  status: 'completed' | 'paused' | 'cancelled'
  completed: number[]
  failed: FailedSurah[]
}

export type DownloadOptions = {
  wifiOnly?: boolean
}

type StoredAudio = {
  reciter: QuranAudioReciter
  surahNumber: number
  blob: Blob
}

type StoredStatus = {
  reciter: QuranAudioReciter
  surahNumber: number
  state: OfflineDownloadState
  reason?: DownloadFailureReason
  byteSize?: number
  updatedAt: number
}

let persistenceAttempted = false
let persistenceGranted: boolean | undefined

class OfflineStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OfflineStorageError'
  }
}

class DownloadError extends Error {
  readonly reason: DownloadFailureReason

  constructor(reason: DownloadFailureReason, message: string) {
    super(message)
    this.name = 'DownloadError'
    this.reason = reason
  }
}

function asStorageError(error: unknown): OfflineStorageError {
  if (error instanceof OfflineStorageError) return error
  return new OfflineStorageError('IndexedDB storage operation failed', { cause: error })
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError'
}

function toFailureReason(error: unknown): DownloadFailureReason {
  if (error instanceof DownloadError) return error.reason
  if (error instanceof OfflineStorageError) return 'storage'
  // An abort that is not a pause/cancel comes from a timeout watchdog.
  if (isAbortError(error)) return 'stalled'
  return 'network'
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

async function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) throw new OfflineStorageError('IndexedDB is unavailable')

  try {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: ['reciter', 'surahNumber'] })
        }
        if (!db.objectStoreNames.contains(STATUS_STORE)) {
          db.createObjectStore(STATUS_STORE, { keyPath: ['reciter', 'surahNumber'] })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    })
  } catch (error) {
    throw asStorageError(error)
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

/** Opens the database, runs the operation, and always closes the connection. */
async function withDatabase<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDatabase()
  try {
    return await run(db)
  } finally {
    db.close()
  }
}

function key(reciter: QuranAudioReciter, surahNumber: number): [QuranAudioReciter, number] {
  return [reciter, surahNumber]
}

function validateSurahNumber(surahNumber: number): void {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > TOTAL_SURAHS) {
    throw new RangeError('surahNumber must be between 1 and 114')
  }
}

async function setStatus(
  reciter: QuranAudioReciter,
  surahNumber: number,
  state: OfflineDownloadState,
  reason?: DownloadFailureReason,
): Promise<void> {
  await withDatabase(async (db) => {
    try {
      const transaction = db.transaction(STATUS_STORE, 'readwrite')
      transaction.objectStore(STATUS_STORE).put({
        reciter,
        surahNumber,
        state,
        reason,
        updatedAt: Date.now(),
      } satisfies StoredStatus)
      await transactionDone(transaction)
    } catch (error) {
      throw asStorageError(error)
    }
  })
}

async function clearStatus(reciter: QuranAudioReciter, surahNumber: number): Promise<void> {
  await withDatabase(async (db) => {
    try {
      const transaction = db.transaction(STATUS_STORE, 'readwrite')
      transaction.objectStore(STATUS_STORE).delete(key(reciter, surahNumber))
      await transactionDone(transaction)
    } catch (error) {
      throw asStorageError(error)
    }
  })
}

async function getStoredStatus(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<OfflineDownloadState | undefined> {
  return withDatabase(async (db) => {
    const transaction = db.transaction(STATUS_STORE, 'readonly')
    const result = await requestResult<StoredStatus | undefined>(
      transaction.objectStore(STATUS_STORE).get(key(reciter, surahNumber)),
    )
    await transactionDone(transaction)
    return result?.state
  })
}

async function storeCompletedAudio(
  reciter: QuranAudioReciter,
  surahNumber: number,
  blob: Blob,
): Promise<void> {
  await withDatabase(async (db) => {
    try {
      const transaction = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
      transaction.objectStore(AUDIO_STORE).put({ reciter, surahNumber, blob } satisfies StoredAudio)
      transaction.objectStore(STATUS_STORE).put({
        reciter,
        surahNumber,
        state: 'completed',
        byteSize: blob.size,
        updatedAt: Date.now(),
      } satisfies StoredStatus)
      await transactionDone(transaction)
      // Never report a download as complete until the stored copy reads back at full size. A WebView
      // that silently drops a large blob write would otherwise show "منزّلة" with nothing to play.
      const readTx = db.transaction(AUDIO_STORE, 'readonly')
      const stored = await requestResult<StoredAudio | undefined>(readTx.objectStore(AUDIO_STORE).get(key(reciter, surahNumber)))
      if (!stored || stored.blob.size !== blob.size) {
        throw new OfflineStorageError('Stored audio did not read back at full size')
      }
    } catch (error) {
      try {
        const cleanup = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
        cleanup.objectStore(AUDIO_STORE).delete(key(reciter, surahNumber))
        cleanup.objectStore(STATUS_STORE).delete(key(reciter, surahNumber))
      } catch { /* Best effort: the failure below is what the user sees. */ }
      throw asStorageError(error)
    }
  })
}

async function markFailed(
  reciter: QuranAudioReciter,
  surahNumber: number,
  reason: DownloadFailureReason,
): Promise<void> {
  await setStatus(reciter, surahNumber, 'failed', reason)
}

async function ensurePersistentStorage(): Promise<boolean | undefined> {
  if (persistenceAttempted) return persistenceGranted
  persistenceAttempted = true

  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return undefined

  try {
    persistenceGranted = await navigator.storage.persist()
  } catch {
    persistenceGranted = false
  }
  return persistenceGranted
}

/** Whether the browser promised to keep downloaded audio (and the outcome if asked). */
export function getStoragePersistence(): { supported: boolean; granted?: boolean } {
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.storage?.persist)
  return { supported, granted: persistenceGranted }
}

/** Real free/total space from the browser, when it reports it. */
export async function getStorageEstimate(): Promise<{ usage?: number; quota?: number }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return {}
  try {
    const estimate = await navigator.storage.estimate()
    return { usage: estimate.usage, quota: estimate.quota }
  } catch {
    return {}
  }
}

/**
 * Actual bytes stored for one reciter, measured from the recorded sizes of the
 * saved files themselves, not from a static per-reciter estimate (issue س13).
 */
export async function getReciterStorageBytes(reciter: QuranAudioReciter): Promise<number> {
  return withDatabase(async (db) => {
    const transaction = db.transaction(STATUS_STORE, 'readonly')
    const entries = await requestResult<StoredStatus[]>(transaction.objectStore(STATUS_STORE).getAll())
    await transactionDone(transaction)
    return entries
      .filter((entry) => entry.reciter === reciter && entry.state === 'completed')
      .reduce((total, entry) => total + (entry.byteSize ?? 0), 0)
  })
}

function looksLikeAudio(first: Uint8Array): boolean {
  // ID3 tag
  if (first.length >= 3 && first[0] === 0x49 && first[1] === 0x44 && first[2] === 0x33) return true
  // MP3 frame sync
  if (first.length >= 2 && first[0] === 0xff && (first[1] & 0xe0) === 0xe0) return true
  return false
}

function validateAudioFile(
  firstChunk: Uint8Array,
  receivedBytes: number,
  declaredLength: number | undefined,
): void {
  if (declaredLength !== undefined && receivedBytes < declaredLength) {
    throw new DownloadError('truncated', `Audio file incomplete: ${receivedBytes} of ${declaredLength} bytes`)
  }
  if (receivedBytes < MIN_AUDIO_BYTES) {
    throw new DownloadError('invalid-content', 'Response is too small to be audio')
  }
  if (!looksLikeAudio(firstChunk)) {
    throw new DownloadError('invalid-content', 'Response is not an MP3 file')
  }
}

/**
 * Downloads one surah with byte-level progress. Each attempt gets its own
 * abort controller chained to the job signal, plus a stall watchdog that
 * aborts when no bytes arrive for BODY_STALL_TIMEOUT_MS, covering the header
 * wait as well as the body.
 */
async function fetchSurahBlobOnce(
  reciter: QuranAudioReciter,
  surahNumber: number,
  outerSignal: AbortSignal,
  onProgress?: (receivedBytes: number, totalBytes: number | undefined) => void,
): Promise<Blob> {
  const attempt = new AbortController()
  let stalled = false
  let stallTimer: ReturnType<typeof setTimeout> | undefined
  const armStallWatchdog = () => {
    if (stallTimer !== undefined) clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      stalled = true
      attempt.abort()
    }, BODY_STALL_TIMEOUT_MS)
  }
  const relay = () => attempt.abort()
  if (outerSignal.aborted) attempt.abort()
  outerSignal.addEventListener('abort', relay, { once: true })

  try {
    armStallWatchdog()
    // fetchWithTimeout is not used here on purpose: it drops the caller's
    // abort signal once the headers arrive, which would make pause/cancel
    // powerless while the body streams. The stall watchdog covers the header
    // wait (same 30s budget) and is re-armed on every chunk.
    const response = await fetch(quranSurahAudioUrl(reciter, surahNumber), { signal: attempt.signal })
    if (!response.ok) {
      throw new DownloadError('http', `Audio download failed: HTTP ${response.status}`)
    }

    const contentType = response.headers?.get?.('content-type') ?? ''
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      throw new DownloadError('invalid-content', 'Server returned a web page instead of audio')
    }
    const declaredRaw = response.headers?.get?.('content-length')
    const declaredLength = declaredRaw ? Number(declaredRaw) : undefined
    const declared = declaredLength !== undefined && Number.isFinite(declaredLength) && declaredLength > 0
      ? declaredLength
      : undefined

    const reader = response.body?.getReader?.()
    if (!reader) {
      // Older WebViews without stream support: no byte progress, still validate.
      const blob = await response.blob()
      const first = new Uint8Array(await blob.slice(0, 3).arrayBuffer())
      validateAudioFile(first, blob.size, declared)
      return blob
    }

    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (stalled) throw new DownloadError('stalled', 'Connection stalled while receiving audio')
      if (done) break
      if (value && value.byteLength > 0) {
        chunks.push(value)
        received += value.byteLength
        armStallWatchdog()
        onProgress?.(received, declared)
      }
    }
    if (stalled) throw new DownloadError('stalled', 'Connection stalled while receiving audio')

    validateAudioFile(chunks[0] ?? new Uint8Array(), received, declared)
    return new Blob(chunks as BlobPart[], { type: contentType || 'audio/mpeg' })
  } catch (error) {
    if (stalled && !(error instanceof DownloadError)) {
      throw new DownloadError('stalled', 'Connection stalled while receiving audio')
    }
    throw error
  } finally {
    if (stallTimer !== undefined) clearTimeout(stallTimer)
    outerSignal.removeEventListener('abort', relay)
  }
}

async function fetchSurahBlob(
  reciter: QuranAudioReciter,
  surahNumber: number,
  signal: AbortSignal,
  onProgress?: (receivedBytes: number, totalBytes: number | undefined) => void,
): Promise<Blob> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (signal.aborted) throw new DOMException('Download aborted', 'AbortError')
    try {
      return await fetchSurahBlobOnce(reciter, surahNumber, signal, onProgress)
    } catch (error) {
      lastError = error
      // Never retry a user pause/cancel, and never retry a response that is
      // deterministically not audio; everything else gets backoff retries.
      if (signal.aborted || isAbortError(error)) throw error
      if (error instanceof DownloadError && error.reason === 'invalid-content') throw error
      if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  throw lastError instanceof Error ? lastError : new DownloadError('network', 'Audio download failed')
}

// --- Download manager (module-level, independent of any mounted screen) ---

type Job = {
  reciter: QuranAudioReciter
  kind: 'surah' | 'reciter'
  pending: number[]
  completed: number[]
  failed: FailedSurah[]
  state: 'running' | 'paused'
  pauseReason?: 'user' | 'wifi'
  cancelled: boolean
  wifiOnly: boolean
  controller: AbortController
  current?: SurahProgress & { startedAt: number }
  promise: Promise<DownloadJobResult>
  resolve: (result: DownloadJobResult) => void
}

const jobs = new Map<QuranAudioReciter, Job>()
const listeners = new Set<(snapshots: DownloadJobSnapshot[]) => void>()
let lastEmitAt = 0
let trailingEmit: ReturnType<typeof setTimeout> | undefined

let activeFetches = 0
const slotWaiters: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (activeFetches < MAX_GLOBAL_CONCURRENCY) {
    activeFetches += 1
    return
  }
  await new Promise<void>((resolve) => slotWaiters.push(resolve))
}

function releaseSlot(): void {
  const next = slotWaiters.shift()
  if (next) {
    next()
    return
  }
  activeFetches -= 1
}

function toSnapshot(job: Job): DownloadJobSnapshot {
  return {
    reciter: job.reciter,
    kind: job.kind,
    state: job.state,
    pauseReason: job.pauseReason,
    pendingCount: job.pending.length,
    completedCount: job.completed.length,
    failed: [...job.failed],
    current: job.current
      ? {
          surahNumber: job.current.surahNumber,
          receivedBytes: job.current.receivedBytes,
          totalBytes: job.current.totalBytes,
          bytesPerSecond: job.current.bytesPerSecond,
        }
      : undefined,
  }
}

function emitNow(): void {
  lastEmitAt = Date.now()
  const snapshots = [...jobs.values()].map(toSnapshot)
  for (const listener of listeners) listener(snapshots)
}

function emitProgress(): void {
  const now = Date.now()
  if (now - lastEmitAt >= PROGRESS_EMIT_MS) {
    emitNow()
    return
  }
  if (trailingEmit === undefined) {
    trailingEmit = setTimeout(() => {
      trailingEmit = undefined
      emitNow()
    }, PROGRESS_EMIT_MS - (now - lastEmitAt))
  }
}

/** Live view of every active or paused download job. */
export function getDownloadJobs(): DownloadJobSnapshot[] {
  return [...jobs.values()].map(toSnapshot)
}

/** Subscribe to job changes; the listener gets the current state immediately. */
export function subscribeToDownloadJobs(
  listener: (snapshots: DownloadJobSnapshot[]) => void,
): () => void {
  listeners.add(listener)
  listener([...jobs.values()].map(toSnapshot))
  return () => {
    listeners.delete(listener)
  }
}

function wifiStatus(): 'wifi' | 'not-wifi' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown'
  const connection = (navigator as Navigator & { connection?: { type?: string } }).connection
  if (!connection || typeof connection.type !== 'string' || connection.type === '') return 'unknown'
  return connection.type === 'wifi' ? 'wifi' : 'not-wifi'
}

function finishJob(job: Job): void {
  const status = job.cancelled ? 'cancelled' : job.state === 'paused' ? 'paused' : 'completed'
  if (status !== 'paused') jobs.delete(job.reciter)
  job.resolve({ status, completed: [...job.completed], failed: [...job.failed] })
  emitNow()
}

async function runJob(job: Job): Promise<void> {
  while (!job.cancelled && job.state === 'running' && job.pending.length > 0) {
    if (job.wifiOnly && wifiStatus() !== 'wifi') {
      job.state = 'paused'
      job.pauseReason = 'wifi'
      break
    }
    const surahNumber = job.pending[0]
    await acquireSlot()
    if (job.cancelled || job.state !== 'running') {
      releaseSlot()
      break
    }

    job.current = {
      surahNumber,
      receivedBytes: 0,
      totalBytes: undefined,
      bytesPerSecond: 0,
      startedAt: Date.now(),
    }
    emitNow()

    try {
      await setStatus(job.reciter, surahNumber, 'downloading')
      const blob = await fetchSurahBlob(job.reciter, surahNumber, job.controller.signal, (received, total) => {
        if (!job.current || job.current.surahNumber !== surahNumber) return
        const elapsedSeconds = Math.max(0.001, (Date.now() - job.current.startedAt) / 1000)
        job.current = {
          ...job.current,
          receivedBytes: received,
          totalBytes: total,
          bytesPerSecond: received / elapsedSeconds,
        }
        emitProgress()
      })
      await storeCompletedAudio(job.reciter, surahNumber, blob)
      job.pending.shift()
      job.completed.push(surahNumber)
    } catch (error) {
      if (job.cancelled || job.state !== 'running') {
        // Paused or cancelled mid-surah: drop the transient status so nothing
        // looks half-downloaded; the surah restarts from byte zero on resume.
        await clearStatus(job.reciter, surahNumber).catch(() => undefined)
        job.current = undefined
        releaseSlot()
        break
      }
      const reason = toFailureReason(error)
      job.pending.shift()
      job.failed.push({ surahNumber, reason })
      await markFailed(job.reciter, surahNumber, reason).catch(() => undefined)
      if (reason === 'storage') {
        // Full disk will fail every remaining surah; stop the job early.
        job.current = undefined
        releaseSlot()
        break
      }
    }

    job.current = undefined
    releaseSlot()
    emitNow()
  }

  finishJob(job)
}

function startJob(
  reciter: QuranAudioReciter,
  kind: 'surah' | 'reciter',
  pending: number[],
  options?: DownloadOptions,
): Promise<DownloadJobResult> {
  // The entry points await storage reads before reaching here, so two rapid
  // calls can both pass their own jobs.get check; re-check at the last moment
  // and hand back the live job instead of duplicating the download.
  const existing = jobs.get(reciter)
  if (existing) {
    if (existing.state === 'paused') return resumeDownload(reciter) ?? existing.promise
    return existing.promise
  }
  let resolve!: (result: DownloadJobResult) => void
  const promise = new Promise<DownloadJobResult>((res) => {
    resolve = res
  })
  const job: Job = {
    reciter,
    kind,
    pending: [...pending],
    completed: [],
    failed: [],
    state: 'running',
    cancelled: false,
    wifiOnly: options?.wifiOnly ?? false,
    controller: new AbortController(),
    promise,
    resolve,
  }
  jobs.set(reciter, job)
  emitNow()
  void runJob(job)
  return promise
}

/**
 * Downloads a whole reciter library, one job per reciter. A second call while
 * a job exists returns the live job (resuming it when paused) instead of
 * duplicating work.
 */
export async function downloadReciterAll(
  reciter: QuranAudioReciter,
  options?: DownloadOptions,
): Promise<DownloadJobResult> {
  const existing = jobs.get(reciter)
  if (existing) {
    if (existing.state === 'paused') return resumeDownload(reciter) ?? existing.promise
    return existing.promise
  }

  await ensurePersistentStorage()
  const summary = await getDownloadStatus(reciter)
  const pending = Array.from({ length: TOTAL_SURAHS }, (_, index) => index + 1).filter(
    (surahNumber) => !summary.completed.includes(surahNumber),
  )
  return startJob(reciter, 'reciter', pending, options)
}

/** Retries only the surahs marked failed, leaving completed ones untouched (issue س14). */
export async function retryFailedDownloads(
  reciter: QuranAudioReciter,
  options?: DownloadOptions,
): Promise<DownloadJobResult | undefined> {
  const existing = jobs.get(reciter)
  if (existing) return existing.promise

  const summary = await getDownloadStatus(reciter)
  const failedOnly = summary.failed.map((entry) => entry.surahNumber).sort((a, b) => a - b)
  if (failedOnly.length === 0) return undefined

  await ensurePersistentStorage()
  return startJob(reciter, 'reciter', failedOnly, options)
}

export async function downloadSurah(
  reciter: QuranAudioReciter,
  surahNumber: number,
  options?: DownloadOptions,
): Promise<DownloadJobResult> {
  validateSurahNumber(surahNumber)
  const existing = jobs.get(reciter)
  if (existing) {
    if (existing.state === 'paused') return resumeDownload(reciter) ?? existing.promise
    return existing.promise
  }

  if (await isSurahDownloaded(reciter, surahNumber)) {
    return { status: 'completed', completed: [surahNumber], failed: [] }
  }

  await ensurePersistentStorage()
  return startJob(reciter, 'surah', [surahNumber], options)
}

/** Pauses a running job: completed surahs are kept, the current surah restarts on resume. */
export function pauseDownload(reciter: QuranAudioReciter): void {
  const job = jobs.get(reciter)
  if (!job || job.state !== 'running') return
  job.state = 'paused'
  job.pauseReason = 'user'
  job.controller.abort()
  emitNow()
}

/** Resumes a paused job from its first incomplete surah. */
export function resumeDownload(reciter: QuranAudioReciter): Promise<DownloadJobResult> | undefined {
  const job = jobs.get(reciter)
  if (!job || job.state !== 'paused') return undefined
  job.state = 'running'
  job.pauseReason = undefined
  job.controller = new AbortController()
  job.promise = new Promise<DownloadJobResult>((res) => {
    job.resolve = res
  })
  emitNow()
  void runJob(job)
  return job.promise
}

/** Cancels a job entirely: no surah is left looking downloaded unless it completed intact. */
export function cancelDownload(reciter: QuranAudioReciter): void {
  const job = jobs.get(reciter)
  if (!job) return
  job.cancelled = true
  if (job.state === 'running') {
    job.controller.abort()
  } else {
    finishJob(job)
  }
  emitNow()
}

export async function getDownloadStatus(reciter: QuranAudioReciter): Promise<StatusSummary> {
  return withDatabase(async (db) => {
    const transaction = db.transaction(STATUS_STORE, 'readonly')
    const statuses = await requestResult<StoredStatus[]>(
      transaction.objectStore(STATUS_STORE).getAll(),
    )
    await transactionDone(transaction)

    const liveJob = jobs.get(reciter)
    const completed: number[] = []
    const failed: FailedSurah[] = []
    const staleDownloading: number[] = []

    for (const entry of statuses) {
      if (entry.reciter !== reciter) continue
      if (entry.state === 'completed') completed.push(entry.surahNumber)
      else if (entry.state === 'failed') {
        failed.push({ surahNumber: entry.surahNumber, reason: entry.reason ?? 'network' })
      } else if (entry.state === 'downloading') {
        // A 'downloading' row with no live job is a leftover from a killed
        // session; reset it so the surah does not look half-downloaded.
        if (!liveJob) staleDownloading.push(entry.surahNumber)
      }
    }

    if (staleDownloading.length > 0) {
      await Promise.all(
        staleDownloading.map((surahNumber) => clearStatus(reciter, surahNumber).catch(() => undefined)),
      )
    }

    return {
      completed: completed.sort((a, b) => a - b),
      failed: failed.sort((a, b) => a.surahNumber - b.surahNumber),
      total: TOTAL_SURAHS,
    }
  })
}

export async function deleteSurah(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<void> {
  validateSurahNumber(surahNumber)
  await withDatabase(async (db) => {
    const transaction = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
    transaction.objectStore(AUDIO_STORE).delete(key(reciter, surahNumber))
    transaction.objectStore(STATUS_STORE).delete(key(reciter, surahNumber))
    await transactionDone(transaction)
  })
}

export async function deleteReciterAll(reciter: QuranAudioReciter): Promise<void> {
  // Settle the cancelled job before wiping: its final in-flight store must
  // not commit after the delete and leave a surah behind.
  const running = jobs.get(reciter)
  cancelDownload(reciter)
  if (running) await running.promise.catch(() => undefined)
  await withDatabase(async (db) => {
    const transaction = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
    const audioStore = transaction.objectStore(AUDIO_STORE)
    const statusStore = transaction.objectStore(STATUS_STORE)

    const statuses = await requestResult<StoredStatus[]>(statusStore.getAll())
    for (const entry of statuses) {
      if (entry.reciter === reciter) {
        audioStore.delete(key(reciter, entry.surahNumber))
        statusStore.delete(key(reciter, entry.surahNumber))
      }
    }
    await transactionDone(transaction)
  })
}

export async function isSurahDownloaded(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<boolean> {
  validateSurahNumber(surahNumber)
  const state = await getStoredStatus(reciter, surahNumber)
  return state === 'completed'
}

export async function getDownloadedSurahBlob(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<Blob | undefined> {
  validateSurahNumber(surahNumber)
  return withDatabase(async (db) => {
    const transaction = db.transaction(AUDIO_STORE, 'readonly')
    const result = await requestResult<StoredAudio | undefined>(
      transaction.objectStore(AUDIO_STORE).get(key(reciter, surahNumber)),
    )
    await transactionDone(transaction)
    return result?.blob
  })
}
