import { describe, expect, it } from 'vitest'
import { isValidBackupValue, validateBackupEntries } from '../../src/app/backupValidation'
import { isBackupKey, LEGACY_UNUSED_KEYS } from '../../src/app/settings'

describe('backup import validation', () => {
  it('accepts the shapes the app itself exports', () => {
    expect(isValidBackupValue('azkar_favorites', '["a:b:c"]')).toBe(true)
    expect(isValidBackupValue('azkar_counts', '{"x":3}')).toBe(true)
    expect(isValidBackupValue('azkar_coords', '{"lat":30.04,"lng":31.24}')).toBe(true)
    expect(isValidBackupValue('azkar_azkar_morning_time', '05:30')).toBe(true)
    expect(isValidBackupValue('azkar_azkar_morning_time', '')).toBe(true)
    expect(isValidBackupValue('azkar_ui_scale', 'lg')).toBe(true)
    for (const v of ['muyassar', 'saddi', 'ibnKathir', 'tabari']) expect(isValidBackupValue('azkar_tafsir_source', v)).toBe(true)
    expect(isValidBackupValue('azkar_font_size', 'xl')).toBe(true)
    expect(isValidBackupValue('azkar_tafsir_muyassar_2:2', 'any cached text')).toBe(true)
  })
  it('rejects damaged values', () => {
    expect(isValidBackupValue('azkar_favorites', '{"a":1}')).toBe(false)
    expect(isValidBackupValue('azkar_favorites', 'not json')).toBe(false)
    expect(isValidBackupValue('azkar_counts', '{"x":-1}')).toBe(false)
    expect(isValidBackupValue('azkar_counts', '[1]')).toBe(false)
    expect(isValidBackupValue('azkar_coords', '{"lat":999,"lng":0}')).toBe(false)
    expect(isValidBackupValue('azkar_daily_ayah_time', '25:99')).toBe(false)
    expect(isValidBackupValue('azkar_khatmah_page', 'abc')).toBe(false)
    expect(isValidBackupValue('azkar_ui_scale', 'x'.repeat(2_000_001))).toBe(false)
    expect(isValidBackupValue('azkar_ui_scale', 5)).toBe(false)
    expect(isValidBackupValue('azkar_ui_scale', 'huge')).toBe(false)
    expect(isValidBackupValue('azkar_tafsir_source', 'bogus')).toBe(false)
    expect(isValidBackupValue('azkar_prayer_calc_method', '9')).toBe(false)
  })
  it('keeps good entries, reports bad ones, ignores foreign keys, still accepts the legacy key', () => {
    const r = validateBackupEntries(
      { azkar_favorites: '[]', azkar_counts: 'oops', zz_unrelated: 'x', [LEGACY_UNUSED_KEYS[0]]: 'round' },
      isBackupKey,
    )
    expect(r.valid.map(([k]) => k).sort()).toEqual([LEGACY_UNUSED_KEYS[0], 'azkar_favorites'].sort())
    expect(r.rejected).toEqual(['azkar_counts'])
  })
})
