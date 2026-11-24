import { describe, expect, it } from 'vitest'
import { PRAYER_PHOTOS } from '../../src/app/features/home/prayerPhotos'

describe('prayer photos', () => {
  it('loads a bundled JPEG data URI for each prayer and keeps credit and licence links', async () => {
    for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const) {
      const photo = PRAYER_PHOTOS[key]
      const src = await photo.load()
      expect(src.startsWith('data:image/jpeg;base64,/9j/')).toBe(true)
      expect(photo.artist.length).toBeGreaterThan(2)
      expect(photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(photo.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\/licenses\//)
    }
  })
})
