import { describe, expect, it } from 'vitest'
import { isValidBackupValue } from '../../src/app/backupValidation'
import { APP_SETTINGS_KEYS, SETTINGS_RESET_KEYS, isBackupKey } from '../../src/app/settings'

describe('adhan_sound is a registered setting', () => {
  it('is exported, imported, reset and mirrored like the other settings', () => {
    expect(APP_SETTINGS_KEYS.adhanSound).toBe('adhan_sound')
    expect(isBackupKey('adhan_sound')).toBe(true)
    expect(SETTINGS_RESET_KEYS).toContain('adhan_sound')
  })
  it('accepts only its three modes on import', () => {
    for (const v of ['adhan', 'default', 'silent']) expect(isValidBackupValue('adhan_sound', v)).toBe(true)
    expect(isValidBackupValue('adhan_sound', 'loud')).toBe(false)
  })
})
