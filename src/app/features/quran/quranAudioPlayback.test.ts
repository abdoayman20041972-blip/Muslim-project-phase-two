import { describe, expect, it } from 'vitest'
import {
  QURAN_AUDIO_RECITERS,
  createConnectedPlayback,
  createSingleAyahPlayback,
  isQuranAudioReciter,
} from './quranAudioPlayback'

describe('quranAudioPlayback', () => {
  it('limits the reference list to the ten approved reciters', () => {
    expect(QURAN_AUDIO_RECITERS).toEqual([
      'ar.minshawi','ar.alafasy','ar.husary','ar.abdulbasitmurattal',
      'ar.abdurrahmaansudais','ar.mahermuaiqly','ar.hudhaify','ar.saoodshuraym',
      'ar.ahmedajamy','ar.shaatree',
    ])
    expect(isQuranAudioReciter('ar.minshawi')).toBe(true)
    expect(isQuranAudioReciter('ar.muhammadayyoob')).toBe(false)
    expect(isQuranAudioReciter('ar.muhammadayyoub')).toBe(false)
  })

  it('creates a single-ayah descriptor without sequencing', () => {
    expect(createSingleAyahPlayback('ar.minshawi', 5)).toEqual({
      kind: 'single-ayah',
      reciter: 'ar.minshawi',
      ayahNumber: 5,
      source: expect.stringContaining('/ar.minshawi/5.mp3'),
    })
  })

  it('rejects an invalid single-ayah number', () => {
    expect(() => createSingleAyahPlayback('ar.minshawi', 0)).toThrow(RangeError)
    expect(() => createSingleAyahPlayback('ar.minshawi', 1.5)).toThrow(RangeError)
  })

  it('creates a connected descriptor as data only', () => {
    expect(createConnectedPlayback('ar.husary', 12)).toEqual({
      kind: 'connected',
      reciter: 'ar.husary',
      surahNumber: 12,
      source: expect.stringContaining('server13.mp3quran.net/husr/012.mp3'),
    })
  })

  it('rejects invalid connected playback data', () => {
    expect(() => createConnectedPlayback('ar.husary', 0)).toThrow(RangeError)
    expect(() => createConnectedPlayback('ar.husary', 115)).toThrow(RangeError)
  })
})
