import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MoreView } from './MoreView'
import { consumeMoreBack } from './moreNav'

vi.mock('../radio/RadioProvider', () => ({ useRadio: () => ({ station: null, status: 'idle', toggle: vi.fn() }) }))
vi.mock('../radio/RadioView', () => ({ RadioView: ({ onBack }: { onBack: () => void }) => <button onClick={onBack}>radio-screen</button> }))

describe('MoreView navigation', () => {
  it('opens the radio, and the hardware back step returns to the More list before leaving More', () => {
    render(<MoreView />)
    expect(consumeMoreBack()).toBe(false)
    fireEvent.click(screen.getByLabelText('فتح إذاعة القرآن الكريم'))
    expect(screen.getByText('radio-screen')).toBeTruthy()
    let consumed = false
    act(() => { consumed = consumeMoreBack() })
    expect(consumed).toBe(true)
    expect(screen.getByTestId('more-radio-card')).toBeTruthy()
    expect(consumeMoreBack()).toBe(false)
  })

  it('opens the essentials screen, which is empty and offers the on-device import until content exists', () => {
    render(<MoreView />)
    fireEvent.click(screen.getByTestId('more-essentials-card'))
    expect(screen.getByTestId('essentials-empty')).toBeTruthy()
    expect(screen.getByTestId('essentials-import')).toBeTruthy()
  })
})

describe('essentials back steps', () => {
  it('system back goes chapter to chapter list to More', async () => {
    localStorage.clear()
    const chapter = { id: 'a', title: 'فصل أ', audience: 'universal', summary: 'ملخص', sections: { explanation: { paragraphs: ['هذا شرح قصير يكفي لعبور حد الأربعين حرفًا في الاختبار هنا.'] } }, sources: [{ title: 'مصدر', rights: 'unverified' }] }
    localStorage.setItem('essentials-pack-v1', JSON.stringify({ version: 1, chapters: [chapter] }))
    render(<MoreView />)
    fireEvent.click(screen.getByTestId('more-essentials-card'))
    fireEvent.click(screen.getByTestId('essentials-card-a'))
    expect(screen.getByTestId('essentials-chapter')).toBeTruthy()
    act(() => { consumeMoreBack() })
    expect(screen.getByTestId('essentials-view')).toBeTruthy()
    act(() => { consumeMoreBack() })
    expect(screen.getByTestId('more-essentials-card')).toBeTruthy()
    localStorage.clear()
  })
})
