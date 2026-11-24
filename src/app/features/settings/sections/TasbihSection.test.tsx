import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialogProvider } from '../../../components/confirm-dialog'
import { TasbihSection } from './TasbihSection'

const props = {
  tasbihSound: true,
  setTasbihSound: vi.fn(),
  vibration: true,
  setVibration: vi.fn(),
  custom: '',
  setCustom: vi.fn(),
  customGoal: '33',
  setCustomGoal: vi.fn(),
  toggle: vi.fn(),
}

describe('TasbihSection button color picker', () => {
  beforeEach(() => localStorage.clear())

  it('saves the chosen color, marks it selected, and notifies the app', () => {
    render(
      <ConfirmDialogProvider>
        <TasbihSection {...props} />
      </ConfirmDialogProvider>,
    )

    const group = screen.getByRole('radiogroup', { name: 'لون زر التسبيح' })
    const swatches = screen.getAllByRole('radio')
    expect(group).toContainElement(swatches[0])
    expect(swatches).toHaveLength(4)
    // Default teal is selected.
    expect(swatches[0].getAttribute('aria-checked')).toBe('true')

    let notified = 0
    window.addEventListener('azkar-settings-changed', () => { notified += 1 })
    fireEvent.click(screen.getByRole('radio', { name: 'الوردي' }))

    expect(localStorage.getItem('azkar_tasbih_button_color')).toBe('rose')
    expect(screen.getByRole('radio', { name: 'الوردي' }).getAttribute('aria-checked')).toBe('true')
    expect(notified).toBe(1)
  })
})
