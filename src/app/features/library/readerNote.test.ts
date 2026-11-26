import { describe, expect, it } from 'vitest'
import { readerNote } from './readerNote'

describe('readerNote', () => {
  it('hides notes containing Latin-letter diagnostics', () => {
    expect(readerNote('5 pages absent from dump (vol 7 p362-366); 2 empty-range entries skipped')).toBeUndefined()
  })
  it('keeps Arabic notes and ignores empty ones', () => {
    expect(readerNote('نص من ويكي مصدر')).toBe('نص من ويكي مصدر')
    expect(readerNote('  ')).toBeUndefined()
    expect(readerNote(undefined)).toBeUndefined()
  })
})
