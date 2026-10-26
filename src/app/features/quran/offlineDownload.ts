import { quranSurahAudioUrl } from '../../constants'
import type { QuranAudioReciter } from './quranAudioPlayback'

const DB_NAME = 'muslim-quran-offline'
const DB_VERSION = 1
const AUDIO_STORE = 'audioFiles'
const STATUS_STORE = 'downloadStatus'
const TOTAL_SURAHS = 114
const MAX_CONCURRENCY = 2
const MAX_RETRIES = 2

export type OfflineDownloadState = 'not-started' | 'downloading' | 'completed' | 'failed'

type StoredAudio = {
  reciter: QuranAudioReciter
  surahNumber: number
  blob: Blob
}

type StoredStatus = {
  reciter: QuranAudioReciter
  surahNumber: number
  state: OfflineDownloadState
  updatedAt: number
}

type StatusSummary = {
  completed: number[]
  total: number
}

let persistenceAttempted = false

class OfflineStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OfflineStorageError'
  }
}

function asStorageError(error: unknown): OfflineStorageError {
  if (error instanceof OfflineStorageError) return error
  return new OfflineStorageError('IndexedDB storage operation failed', { cause: error })
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
): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STATUS_STORE, 'readwrite')
    transaction.objectStore(STATUS_STORE).put({
      reciter,
      surahNumber,
      state,
      updatedAt: Date.now(),
    } satisfies StoredStatus)
    try {
      await transactionDone(transaction)
    } catch (error) {
      throw asStorageError(error)
    }
  } catch (error) {
    throw asStorageError(error)
  } finally {
    db.close()
  }
}

async function getStoredStatus(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<OfflineDownloadState | undefined> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STATUS_STORE, 'readonly')
    const result = await requestResult<StoredStatus | undefined>(
      transaction.objectStore(STATUS_STORE).get(key(reciter, surahNumber)),
    )
    await transactionDone(transaction)
    return result?.state
  } finally {
    db.close()
  }
}

async function storeCompletedAudio(
  reciter: QuranAudioReciter,
  surahNumber: number,
  blob: Blob,
): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
    transaction.objectStore(AUDIO_STORE).put({ reciter, surahNumber, blob } satisfies StoredAudio)
    transaction.objectStore(STATUS_STORE).put({
      reciter,
      surahNumber,
      state: 'completed',
      updatedAt: Date.now(),
    } satisfies StoredStatus)
    await transactionDone(transaction)
  } catch (error) {
    throw asStorageError(error)
  } finally {
    db.close()
  }
}

async function markFailed(reciter: QuranAudioReciter, surahNumber: number): Promise<void> {
  await setStatus(reciter, surahNumber, 'failed')
}

async function ensurePersistentStorage(): Promise<void> {
  if (persistenceAttempted) return
  persistenceAttempted = true

  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return

  try {
    await navigator.storage.persist()
  } catch {
    // Persistence is best-effort; the download can still proceed.
  }
}

async function fetchSurahBlob(reciter: QuranAudioReciter, surahNumber: number): Promise<Blob> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(quranSurahAudioUrl(reciter, surahNumber))
      if (!response.ok) throw new Error(`Audio download failed: HTTP ${response.status}`)
      return await response.blob()
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Audio download failed')
}

export async function downloadSurah(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<void> {
  validateSurahNumber(surahNumber)
  await ensurePersistentStorage()
  await setStatus(reciter, surahNumber, 'downloading')

  try {
    const blob = await fetchSurahBlob(reciter, surahNumber)
    await storeCompletedAudio(reciter, surahNumber, blob)
  } catch (error) {
    await markFailed(reciter, surahNumber)
    throw error
  }
}

function isStorageError(error: unknown): boolean {
  return error instanceof OfflineStorageError
}

export async function downloadReciterAll(reciter: QuranAudioReciter): Promise<void> {
  await ensurePersistentStorage()
  const summary = await getDownloadStatus(reciter)
  const pending = Array.from({ length: TOTAL_SURAHS }, (_, index) => index + 1)
    .filter((surahNumber) => !summary.completed.includes(surahNumber))

  let cursor = 0
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, Math.max(1, pending.length)) },
    async () => {
      while (cursor < pending.length) {
        const surahNumber = pending[cursor]
        cursor += 1
        try {
          await downloadSurah(reciter, surahNumber)
        } catch (error) {
          if (isStorageError(error)) throw error
          // A single network failure is isolated; continue with the queue.
        }
      }
    },
  )

  await Promise.all(workers)
}

export async function getDownloadStatus(reciter: QuranAudioReciter): Promise<StatusSummary> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STATUS_STORE, 'readonly')
    const statuses = await requestResult<StoredStatus[]>(
      transaction.objectStore(STATUS_STORE).getAll(),
    )
    await transactionDone(transaction)
    return {
      completed: statuses
        .filter((entry) => entry.reciter === reciter && entry.state === 'completed')
        .map((entry) => entry.surahNumber)
        .sort((a, b) => a - b),
      total: TOTAL_SURAHS,
    }
  } finally {
    db.close()
  }
}

export async function deleteSurah(
  reciter: QuranAudioReciter,
  surahNumber: number,
): Promise<void> {
  validateSurahNumber(surahNumber)
  const db = await openDatabase()
  try {
    const transaction = db.transaction([AUDIO_STORE, STATUS_STORE], 'readwrite')
    transaction.objectStore(AUDIO_STORE).delete(key(reciter, surahNumber))
    transaction.objectStore(STATUS_STORE).delete(key(reciter, surahNumber))
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function deleteReciterAll(reciter: QuranAudioReciter): Promise<void> {
  const db = await openDatabase()
  try {
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
  } finally {
    db.close()
  }
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
  const db = await openDatabase()
  try {
    const transaction = db.transaction(AUDIO_STORE, 'readonly')
    const result = await requestResult<StoredAudio | undefined>(
      transaction.objectStore(AUDIO_STORE).get(key(reciter, surahNumber)),
    )
    await transactionDone(transaction)
    return result?.blob
  } finally {
    db.close()
  }
}
