import { describe, expect, it } from 'vitest'
import { parseReference } from './zikrReference'

describe('parseReference', () => {
  it('classifies a normal bracketed Bonyan reference', () => {
    expect(parseReference('. [البقرة - 201].')).toEqual({
      kind: 'bracketed',
      value: '. [البقرة - 201].',
      ignored: false,
    })
  })

  it('classifies the documented malformed Bonyan reference without repairing it', () => {
    const malformed = ". [البقرة\\n', '- 286]."
    expect(parseReference(malformed)).toEqual({
      kind: 'bracketed',
      value: malformed,
      ignored: false,
    })
  })

  it('classifies a direct رواه attribution', () => {
    expect(parseReference('رواه مسلم')).toEqual({
      kind: 'hadith-attribution',
      value: 'رواه مسلم',
      ignored: false,
    })
  })

  it('classifies a متفق عليه reference', () => {
    expect(parseReference('سيد الاستغفار — متفق عليه')).toEqual({
      kind: 'muttafaq-alayh',
      value: 'سيد الاستغفار — متفق عليه',
      ignored: false,
    })
  })

  it('classifies a free Quranic reference', () => {
    expect(parseReference('آية الكرسي — البقرة ٢٥٥')).toEqual({
      kind: 'quranic-free',
      value: 'آية الكرسي — البقرة ٢٥٥',
      ignored: false,
    })
  })

  it('classifies free non-attribution text', () => {
    expect(parseReference('صيغة استغفار جامعة')).toEqual({
      kind: 'free-text',
      value: 'صيغة استغفار جامعة',
      ignored: false,
    })
  })

  it('classifies an attribution embedded after a description', () => {
    expect(parseReference('من قرأها عند النوم لم يزل عليه من الله حافظ — رواه البخاري')).toEqual({
      kind: 'embedded-attribution',
      value: 'من قرأها عند النوم لم يزل عليه من الله حافظ — رواه البخاري',
      ignored: false,
    })
  })

  it('classifies stop as a special ignored value', () => {
    expect(parseReference('stop')).toEqual({
      kind: 'stop',
      value: 'stop',
      ignored: true,
    })
  })
})
