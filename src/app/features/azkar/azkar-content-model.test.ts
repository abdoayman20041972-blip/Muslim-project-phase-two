import { describe, expect, it } from 'vitest'
import { azkarCategories, totalAzkarCount } from '../../../azkar-data'
import { countedItems, isCountedZikr } from './azkarProgress'

const strip = (text: string) => text.replace(/[ً-ٰٓ]/g, '').replace(/[^؀-ۿ0-9a-zA-Z]/g, '')

const allItems = azkarCategories.flatMap((category) => category.items.map((item) => ({ category, item })))

describe('azkar content model', () => {
  it('assigns every item a stable explicit id, unique within the catalog', () => {
    const ids = allItems.map(({ item }) => item.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('removes raw dataset brackets, tatweel and wrapping parentheses from every text', () => {
    for (const { item } of allItems) {
      expect(item.text).not.toMatch(/\(\(|\)\)|ـ/)
      expect(item.text.trim().startsWith('(')).toBe(false)
      expect(item.text.trim().endsWith(')')).toBe(false)
      expect(item.text.trim().endsWith('.')).toBe(false)
    }
  })

  it('never shows a counter on fadl or guidance items', () => {
    for (const { item } of allItems) {
      if (!isCountedZikr(item)) expect(item.repeat).toBeUndefined()
    }
  })

  it('keeps a displayed source on every counted item that has a count', () => {
    for (const { item } of allItems) {
      if (isCountedZikr(item) && (item.repeat ?? 1) > 1) {
        expect(item.source?.trim().length ?? 0).toBeGreaterThan(0)
      }
    }
  })

  it('drops the fabricated hasbi Allah x7 count and cites the ayah', () => {
    const hasbi = allItems.filter(({ item }) => item.text.startsWith('حَسْبِيَ اللَّهُ'))
    expect(hasbi.length).toBe(2)
    for (const { item } of hasbi) {
      expect(item.repeat).toBeUndefined()
      expect(item.source).toBe('التوبة ١٢٩')
      expect(item.reference?.url).toContain('quran.com/9/129')
    }
  })

  it('corrects sayyid al-istighfar attribution to Bukhari 6306', () => {
    const sayyid = allItems.filter(({ item }) => item.source?.includes('سيد الاستغفار'))
    expect(sayyid.length).toBe(2)
    for (const { item } of sayyid) {
      expect(item.source).toContain('البخاري ٦٣٠٦')
      expect(item.source).not.toContain('متفق عليه')
    }
  })

  it('merges the evening amsayna into the full Muslim 2723a wording without the truncated duplicate', () => {
    const evening = azkarCategories.find((c) => c.id === 'evening')!
    const amsayna = evening.items.filter((item) => item.text.startsWith('أَمْسَيْنَا'))
    expect(amsayna.length).toBe(1)
    expect(amsayna[0].text).toContain('الْكَسَلِ')
    expect(amsayna[0].text).toContain('سُوءِ الْكِبَرِ')
    expect(amsayna[0].source).toContain('٢٧٢٣')
    expect(evening.items.length).toBe(13)
  })

  it('fixes the kufr/faqr dua to the Abu Dawud 5090 wording with its count of three', () => {
    const items = allItems.filter(({ item }) => item.text.includes('الْكُفْرِ وَالْفَقْرِ'))
    expect(items.length).toBe(2)
    for (const { item } of items) {
      expect(item.text).toContain('لَا إِلَهَ إِلَّا أَنْتَ')
      expect(item.repeat).toBe(3)
      expect(item.source).toContain('٥٠٩٠')
    }
  })

  it('marks every istighfar-section report as fadl without counts', () => {
    const istighfar = azkarCategories.find((c) => c.id === 'istighfar')!
    expect(istighfar.items.length).toBe(18)
    for (const item of istighfar.items) {
      expect(item.kind).toBe('fadl')
      expect(item.repeat).toBeUndefined()
    }
  })

  it('removes exact duplicate texts inside each category', () => {
    for (const category of azkarCategories) {
      const seen = new Set<string>()
      for (const item of category.items) {
        const key = strip(item.text)
        expect(seen.has(key), `duplicate in ${category.id}: ${item.text.slice(0, 30)}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('applies sourced counts: yashfiyak x7, subhan al-malik x3, subhanAllah wa bihamdihi x100 with Muslim 2691', () => {
    const yashfiyak = allItems.find(({ item }) => item.text.includes('أَنْ يَشْفيَكَ'))?.item
    expect(yashfiyak?.repeat).toBe(7)
    const malik = allItems.find(({ item }) => item.text.includes('سُبْحَانَ المَلِكِ'))?.item
    expect(malik?.repeat).toBe(3)
    const hundreds = allItems.filter(({ item }) => item.repeat === 100)
    for (const { item } of hundreds) expect(item.source).toContain('٢٦٩١')
  })

  it('counts progress over counted dhikr only', () => {
    const morning = azkarCategories.find((c) => c.id === 'morning')!
    expect(countedItems(morning.items).length).toBe(morning.items.length)
    const istighfar = azkarCategories.find((c) => c.id === 'istighfar')!
    expect(countedItems(istighfar.items).length).toBe(0)
  })

  it('keeps the catalog smaller after dedup', () => {
    expect(totalAzkarCount).toBe(138)
  })
})
