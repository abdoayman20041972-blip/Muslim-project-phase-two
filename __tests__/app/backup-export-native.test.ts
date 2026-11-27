import { describe, expect, it, vi } from 'vitest'

const writeFile = vi.fn().mockResolvedValue({})
const rmdir = vi.fn().mockResolvedValue({})
const getUri = vi.fn().mockResolvedValue({ uri: 'file:///cache/backups/b.json' })
const share = vi.fn()
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/filesystem', () => ({ Filesystem: { writeFile, getUri, rmdir }, Directory: { Cache: 'CACHE' } }))
vi.mock('@capacitor/share', () => ({ Share: { share } }))

describe('backup export on native (mocked plugins; real device untested)', () => {
  it('writes UTF-8 base64 to the cache folder then opens the share sheet', async () => {
    const { saveBackupFile } = await import('../../src/app/backupIO')
    share.mockResolvedValueOnce({})
    expect(await saveBackupFile('{"a":"مسلم"}', 'b.json')).toBe(true)
    const arg = writeFile.mock.calls[0][0]
    expect(arg.directory).toBe('CACHE')
    expect(Buffer.from(arg.data, 'base64').toString('utf8')).toBe('{"a":"مسلم"}')
    // Old exports are cleared before the new one is written.
    expect(rmdir).toHaveBeenCalledWith(expect.objectContaining({ path: 'backups', directory: 'CACHE', recursive: true }))
    expect(rmdir.mock.invocationCallOrder[0]).toBeLessThan(writeFile.mock.invocationCallOrder[0])
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/backups/b.json'] }))
  })
  it('treats a closed share sheet as success and a real error as failure', async () => {
    const { saveBackupFile } = await import('../../src/app/backupIO')
    share.mockRejectedValueOnce(new Error('Share canceled'))
    expect(await saveBackupFile('{}', 'b.json')).toBe(true)
    rmdir.mockClear()
    writeFile.mockRejectedValueOnce(new Error('disk full'))
    expect(await saveBackupFile('{}', 'b.json')).toBe(false)
    // A failed export leaves no file behind.
    expect(rmdir.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
  it('ignores a second export while one is open and keeps the file after a share error', async () => {
    const { saveBackupFile } = await import('../../src/app/backupIO')
    rmdir.mockClear(); writeFile.mockClear(); share.mockReset()
    let finish: (v?: unknown) => void = () => undefined
    share.mockImplementationOnce(() => new Promise((r) => { finish = r }))
    const first = saveBackupFile('{}', 'b.json')
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    // Second tap while the first share sheet is open: no new write, no cleanup.
    expect(await saveBackupFile('{}', 'b.json')).toBe(true)
    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(rmdir).toHaveBeenCalledTimes(1)
    finish({})
    expect(await first).toBe(true)
    // A real share error after hand-off reports failure but does not delete the file.
    rmdir.mockClear()
    share.mockRejectedValueOnce(new Error('share target crashed'))
    expect(await saveBackupFile('{}', 'b.json')).toBe(false)
    expect(rmdir).toHaveBeenCalledTimes(1) // only the pre-write clear of the previous export
    // The busy flag is released afterwards.
    share.mockResolvedValueOnce({})
    expect(await saveBackupFile('{}', 'b.json')).toBe(true)
  })
})
