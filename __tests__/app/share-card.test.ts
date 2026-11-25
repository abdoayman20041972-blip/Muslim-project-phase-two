import { describe, expect, it, vi } from 'vitest'
import { shareCardImage } from '../../src/app/features/azkar/shareCard'

describe('shareCardImage', () => {
  it('returns false when the platform cannot share image files, so callers fall back to text', async () => {
    const original = navigator.share
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    expect(await shareCardImage({ text: 'نص', reference: 'مرجع' })).toBe(false)
    Object.defineProperty(navigator, 'share', { value: original, configurable: true })
  })
  it('shares a PNG file when the Web Share API accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    const fakeCtx = new Proxy({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }) } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => undefined), set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/png' })))
    expect(await shareCardImage({ text: 'نص الآية', filename: 'a.png' })).toBe(true)
    const arg = share.mock.calls[0][0] as { files: File[] }
    expect(arg.files[0].type).toBe('image/png')
    expect(arg.files[0].name).toBe('a.png')
  })
})
