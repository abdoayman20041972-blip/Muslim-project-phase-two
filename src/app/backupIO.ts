import { Capacitor } from '@capacitor/core'

type MirrorFn = (entries: [string, string][]) => Promise<boolean>

export type ApplyBackupResult =
  | { ok: true }
  | { ok: false; reason: 'mirror' | 'storage'; restored: boolean }

/**
 * Replaces every backup key in `storage` with `entries`, all or nothing.
 * The old values are snapshotted first. Any failure (storage throws, quota, or the
 * native mirror refusing) puts the old values back in both places.
 */
export async function applyBackupAtomically(
  entries: [string, string][],
  isBackupKey: (key: string) => boolean,
  replaceMirror: MirrorFn,
  storage: Storage = localStorage,
): Promise<ApplyBackupResult> {
  const snapshot: [string, string][] = []
  for (const key of Object.keys(storage)) {
    if (!isBackupKey(key)) continue
    const value = storage.getItem(key)
    if (value !== null) snapshot.push([key, value])
  }
  const restore = async (reason: 'mirror' | 'storage'): Promise<ApplyBackupResult> => {
    let restored = true
    try {
      for (const key of Object.keys(storage)) if (isBackupKey(key)) storage.removeItem(key)
      for (const [key, value] of snapshot) storage.setItem(key, value)
    } catch (error) {
      console.error('[backup] local restore failed', error)
      restored = false
    }
    if (reason === 'mirror') {
      try {
        if (!(await replaceMirror(snapshot))) restored = false
      } catch {
        restored = false
      }
    }
    return { ok: false, reason, restored }
  }
  try {
    for (const key of Object.keys(storage)) if (isBackupKey(key)) storage.removeItem(key)
    for (const [key, value] of entries) storage.setItem(key, value)
  } catch (error) {
    console.error('[backup] import write failed', error)
    return restore('storage')
  }
  let mirrored = false
  try {
    mirrored = await replaceMirror(entries)
  } catch (error) {
    console.error('[backup] mirror failed', error)
  }
  if (!mirrored) return restore('mirror')
  return { ok: true }
}

const toBase64Utf8 = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/**
 * Saves a backup file. Native: written to the cache folder and handed to the system share
 * sheet (same path as share cards). Web: normal anchor download. Returns false on failure.
 */
export async function saveBackupFile(json: string, filename: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const path = `backups/${filename}`
      // The share target may still be reading the previous export, so old copies are removed
      // here, at the start of the next export, not right after the sheet closes.
      await Filesystem.rmdir({ path: 'backups', directory: Directory.Cache, recursive: true }).catch(() => undefined)
      await Filesystem.writeFile({ path, data: toBase64Utf8(json), directory: Directory.Cache, recursive: true })
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
      await Share.share({ files: [uri], dialogTitle: 'حفظ النسخة الاحتياطية' })
      return true
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? error)
      // Closing the share sheet is not a failure.
      if (/cancel/i.test(message)) return true
      console.error('[backup] native export failed', error)
      // Nothing was shared: do not leave the file behind.
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        await Filesystem.rmdir({ path: 'backups', directory: Directory.Cache, recursive: true })
      } catch { /* nothing to clean */ }
      return false
    }
  }
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return true
  } catch (error) {
    console.error('[backup] web export failed', error)
    return false
  }
}
