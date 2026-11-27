import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyBackupAtomically, saveBackupFile } from '../../src/app/backupIO'

const isKey = (k: string) => k.startsWith('azkar_')
const dump = () => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))

describe('atomic backup import', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('azkar_a', 'old-a')
    localStorage.setItem('azkar_b', 'old-b')
    localStorage.setItem('other', 'keep')
  })

  it('replaces backup keys, leaves others, and mirrors the new entries', async () => {
    const mirror = vi.fn().mockResolvedValue(true)
    const r = await applyBackupAtomically([['azkar_c', 'new-c']], isKey, mirror)
    expect(r).toEqual({ ok: true })
    expect(dump()).toEqual({ azkar_c: 'new-c', other: 'keep' })
    expect(mirror).toHaveBeenCalledWith([['azkar_c', 'new-c']])
  })

  it('restores old values and the old mirror when the mirror refuses', async () => {
    const mirror = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const r = await applyBackupAtomically([['azkar_c', 'new-c']], isKey, mirror)
    expect(r).toEqual({ ok: false, reason: 'mirror', restored: true })
    expect(dump()).toEqual({ azkar_a: 'old-a', azkar_b: 'old-b', other: 'keep' })
    expect(mirror).toHaveBeenLastCalledWith(expect.arrayContaining([['azkar_a', 'old-a'], ['azkar_b', 'old-b']]))
  })

  it('restores when the mirror throws', async () => {
    const mirror = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(true)
    const r = await applyBackupAtomically([['azkar_c', 'new-c']], isKey, mirror)
    expect(r.ok).toBe(false)
    expect(dump()).toEqual({ azkar_a: 'old-a', azkar_b: 'old-b', other: 'keep' })
  })

  it('restores when a write fails midway (quota)', async () => {
    const real = Storage.prototype.setItem
    let calls = 0
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      calls += 1
      if (calls === 2) throw new Error('QuotaExceeded')
      return real.call(this, k, v)
    })
    const mirror = vi.fn().mockResolvedValue(true)
    const r = await applyBackupAtomically([['azkar_c', '1'], ['azkar_d', '2']], isKey, mirror)
    spy.mockRestore()
    expect(r).toEqual({ ok: false, reason: 'storage', restored: true })
    expect(dump()).toEqual({ azkar_a: 'old-a', azkar_b: 'old-b', other: 'keep' })
    expect(mirror).not.toHaveBeenCalled()
  })

  it('reports restored:false when the old mirror cannot be restored', async () => {
    const mirror = vi.fn().mockResolvedValue(false)
    const r = await applyBackupAtomically([['azkar_c', 'x']], isKey, mirror)
    expect(r).toEqual({ ok: false, reason: 'mirror', restored: false })
  })
})

describe('backup export (web fallback)', () => {
  it('downloads through an anchor on the web and reports success', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await saveBackupFile('{}', 'b.json')).toBe(true)
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})
