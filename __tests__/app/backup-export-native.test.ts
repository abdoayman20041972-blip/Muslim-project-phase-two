import { describe, expect, it, vi } from 'vitest'

const writeFile = vi.fn().mockResolvedValue({})
const getUri = vi.fn().mockResolvedValue({ uri: 'file:///cache/backups/b.json' })
const share = vi.fn()
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/filesystem', () => ({ Filesystem: { writeFile, getUri }, Directory: { Cache: 'CACHE' } }))
vi.mock('@capacitor/share', () => ({ Share: { share } }))

describe('backup export on native (mocked plugins; real device untested)', () => {
  it('writes UTF-8 base64 to the cache folder then opens the share sheet', async () => {
    const { saveBackupFile } = await import('../../src/app/backupIO')
    share.mockResolvedValueOnce({})
    expect(await saveBackupFile('{"a":"مسلم"}', 'b.json')).toBe(true)
    const arg = writeFile.mock.calls[0][0]
    expect(arg.directory).toBe('CACHE')
    expect(Buffer.from(arg.data, 'base64').toString('utf8')).toBe('{"a":"مسلم"}')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/backups/b.json'] }))
  })
  it('treats a closed share sheet as success and a real error as failure', async () => {
    const { saveBackupFile } = await import('../../src/app/backupIO')
    share.mockRejectedValueOnce(new Error('Share canceled'))
    expect(await saveBackupFile('{}', 'b.json')).toBe(true)
    writeFile.mockRejectedValueOnce(new Error('disk full'))
    expect(await saveBackupFile('{}', 'b.json')).toBe(false)
  })
})
