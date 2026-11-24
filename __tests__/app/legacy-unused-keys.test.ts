import { describe, expect, it } from 'vitest'
import { APP_SETTINGS_KEYS, BACKUP_KEYS, LEGACY_UNUSED_KEYS, SETTINGS_RESET_KEYS, isBackupKey } from '../../src/app/settings'

describe('legacy unused settings keys', () => {
  it('the tasbih button shape key is no longer a registered setting', () => {
    expect(Object.values(APP_SETTINGS_KEYS)).not.toContain('azkar_tasbih_button_shape')
    expect(LEGACY_UNUSED_KEYS).toContain('azkar_tasbih_button_shape')
  })
  it('old backups carrying it still import, and reset clears a stale value', () => {
    expect(isBackupKey('azkar_tasbih_button_shape')).toBe(true)
    expect(BACKUP_KEYS.has('azkar_tasbih_button_shape')).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain('azkar_tasbih_button_shape')
  })
})
