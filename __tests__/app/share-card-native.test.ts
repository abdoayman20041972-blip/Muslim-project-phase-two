import { describe, expect, it, vi } from 'vitest'

const writeFile = vi.fn().mockResolvedValue({ uri: 'x' })
const getUri = vi.fn().mockResolvedValue({ uri: 'file:///cache/share/card.png' })
const share = vi.fn().mockResolvedValue({})

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/filesystem', () => ({ Filesystem: { writeFile, getUri }, Directory: { Cache: 'CACHE' } }))
vi.mock('@capacitor/share', () => ({ Share: { share } }))

import { shareCardImage } from '../../src/app/features/azkar/shareCard'

describe('shareCardImage in the Android app', () => {
  it('writes the PNG to the cache folder and shares its file URI', async () => {
    const fakeCtx = new Proxy({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }) } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => undefined), set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['png'], { type: 'image/png' })))
    expect(await shareCardImage({ text: 'نص الآية', heading: 'آية اليوم', filename: 'card.png' })).toBe(true)
    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(writeFile.mock.calls[0][0]).toMatchObject({ directory: 'CACHE', recursive: true })
    expect(typeof writeFile.mock.calls[0][0].data).toBe('string')
    expect(share).toHaveBeenCalledWith({ files: ['file:///cache/share/card.png'], dialogTitle: 'آية اليوم' })
  })
  it('returns false when writing fails so the caller falls back to text', async () => {
    writeFile.mockRejectedValueOnce(new Error('disk full'))
    expect(await shareCardImage({ text: 'نص' })).toBe(false)
  })
})
