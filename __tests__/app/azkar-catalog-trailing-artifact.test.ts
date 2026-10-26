import { describe, expect, it } from 'vitest'

function stripTrailingArtifact(text: string): string {
  return text.replace(/(?:\s*'\s*,?){4,}\s*$/, '').trim()
}

function extractEmbeddedSource(text: string) {
  const match = text.match(/\[([^\[\]]+)\]\.?\s*$/)
  if (!match) return { text, source: undefined }
  return { text: text.slice(0, match.index).trim().replace(/[.!،,:;\s]+$/u, ''), source: `[${match[1].trim()}]` }
}

describe('Azkar trailing artifact cleanup', () => {
  it('strips the confirmed normalized artifact and allows embedded source extraction', () => {
    const text = "دعاء مثال [البقرة - 201]. ', ', ', ', ', ', ', ', '"
    const trimmed = stripTrailingArtifact(text)
    const extracted = extractEmbeddedSource(trimmed)
    expect(trimmed).toBe('دعاء مثال [البقرة - 201].')
    expect(extracted.source).toBe('[البقرة - 201]')
    expect(extracted.text).toBe('دعاء مثال')
  })
  it('leaves natural text with fewer than four quote repetitions unchanged', () => {
    const samples = ['نص طبيعي', "نص طبيعي '", "نص طبيعي ', '", "نص طبيعي ', ', '"]
    for (const sample of samples) expect(stripTrailingArtifact(sample)).toBe(sample)
  })
  it('does not strip exactly two trailing quote repetitions', () => {
    const sample = "نص طبيعي ', '"
    expect(stripTrailingArtifact(sample)).toBe(sample)
  })
})
