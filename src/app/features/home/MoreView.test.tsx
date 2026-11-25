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
})
