import { beforeEach, describe, expect, it, vi } from 'vitest'

const geo = {
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geo }))

const fix = { coords: { latitude: 30.0444, longitude: 31.2357 } }

async function run() {
  const { acquireLocation } = await import('../../src/app/features/location/acquireLocation')
  return acquireLocation()
}

describe('acquireLocation (native)', () => {
  beforeEach(() => {
    Object.values(geo).forEach((fn) => fn.mockReset())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('accepts an approximate-only grant and uses the cached fix first', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockResolvedValue(fix)
    const result = await run()
    expect(result).toMatchObject({ ok: true, source: 'recent', coords: { lat: 30.04, lng: 31.24 } })
    expect(geo.requestPermissions).not.toHaveBeenCalled()
    expect(geo.getCurrentPosition).toHaveBeenCalledWith(expect.objectContaining({ maximumAge: 600000 }))
  })

  it('falls back to a high-accuracy fix when the cached attempt times out', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockRejectedValueOnce(new Error('Timeout expired')).mockResolvedValueOnce(fix)
    const result = await run()
    expect(result).toMatchObject({ ok: true, source: 'high-accuracy' })
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2)
  })

  it('stops at once and names the cause when location services are off', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockRejectedValue(new Error('Location services are not enabled'))
    const result = await run()
    expect(result).toMatchObject({ ok: false, reason: 'services-disabled' })
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('reports a refused permission without trying to read a position', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
    geo.requestPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' })
    const result = await run()
    expect(result).toMatchObject({ ok: false, reason: 'permission-denied' })
    expect(geo.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('reports a timeout when both attempts time out', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockRejectedValue(new Error('Timeout expired'))
    const result = await run()
    expect(result).toMatchObject({ ok: false, reason: 'timeout' })
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2)
  })
})
