import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCustomTasbih,
  CUSTOM_TASBIH_KEY,
  deleteCustomTasbih,
  getCustomTasbihList,
  saveCustomTasbihList,
  updateCustomTasbih,
} from '../../src/app/features/tasbih/customTasbih'

describe('custom tasbih storage', () => {
  beforeEach(() => localStorage.clear())

  it('reads an empty list when the key is missing', () => {
    expect(getCustomTasbihList()).toEqual([])
  })

  it('returns an empty list for corrupted JSON without throwing', () => {
    localStorage.setItem(CUSTOM_TASBIH_KEY, '{bad-json')
    expect(getCustomTasbihList()).toEqual([])
  })

  it('uses the exact existing key and persists added entries', () => {
    expect(CUSTOM_TASBIH_KEY).toBe('azkar_custom_tasbih_list')
    const entry = { id: 'custom-1', word: 'سبحان الله', goal: 33 }
    expect(addCustomTasbih(entry)).toEqual([entry])
    expect(JSON.parse(localStorage.getItem(CUSTOM_TASBIH_KEY)!)).toEqual([entry])
  })

  it('saves and updates an entry without changing its id', () => {
    const entry = { id: 'custom-1', word: 'سبحان الله', goal: 33 }
    saveCustomTasbihList([entry])
    expect(updateCustomTasbih('custom-1', { word: 'الحمد لله', goal: 100 })).toEqual([
      { id: 'custom-1', word: 'الحمد لله', goal: 100 },
    ])
  })

  it('deletes only the requested entry', () => {
    const first = { id: 'custom-1', word: 'سبحان الله', goal: 33 }
    const second = { id: 'custom-2', word: 'الحمد لله', goal: 34 }
    saveCustomTasbihList([first, second])
    expect(deleteCustomTasbih('custom-1')).toEqual([second])
  })
})
