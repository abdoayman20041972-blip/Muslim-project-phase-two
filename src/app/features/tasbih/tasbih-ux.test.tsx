import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import { TasbihView } from './TasbihView'
import { deleteCustomTasbih } from './customTasbih'
import { getTasbihButtonColor } from './tasbihButtonColor'

function renderView(selectedWord: string | null = null) {
  const onSelectWord = vi.fn()
  render(
    <ConfirmDialogProvider>
      <TasbihView
        counts={{}}
        dayTotal={0}
        selectedWord={selectedWord}
        roundCounts={{}}
        rounds={{}}
        onTap={vi.fn()}
        onResetWord={vi.fn()}
        onResetToday={vi.fn()}
        onSelectWord={onSelectWord}
        setView={vi.fn()}
      />
    </ConfirmDialogProvider>,
  )
  return { onSelectWord }
}

const trigger = () => screen.getByRole('button', { name: /الذكر/ })

describe('tasbih phrase picker accessibility', () => {
  beforeEach(() => localStorage.clear())

  it('closes on Escape and returns focus to the trigger', () => {
    renderView()
    fireEvent.click(trigger())
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('closes on a press outside the picker', () => {
    renderView()
    fireEvent.click(trigger())
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('does not close on a press inside the picker', () => {
    renderView()
    fireEvent.click(trigger())
    fireEvent.pointerDown(screen.getByRole('listbox'))
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('moves focus with ArrowDown/ArrowUp/Home/End and selects the focused option', () => {
    const { onSelectWord } = renderView()
    fireEvent.click(trigger())
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(2)
    // Opening focuses the currently selected option (the first one by default).
    expect(document.activeElement).toBe(options[0])

    fireEvent.keyDown(options[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[1])
    fireEvent.keyDown(options[1], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(options[0])
    fireEvent.keyDown(options[0], { key: 'End' })
    expect(document.activeElement).toBe(options[options.length - 1])
    fireEvent.keyDown(options[options.length - 1], { key: 'Home' })
    expect(document.activeElement).toBe(options[0])
    // ArrowUp from the first option wraps to the last.
    fireEvent.keyDown(options[0], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(options[options.length - 1])

    fireEvent.click(document.activeElement as Element)
    expect(onSelectWord).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('opens the picker with ArrowDown on the trigger', () => {
    renderView()
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
  })
})

describe('tasbih button color customization (color only)', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to teal and applies the saved color class to the count button', () => {
    renderView()
    const button = screen.getByRole('button', { name: /تسجيل تسبيحة/ })
    expect(button.className).toContain('tasbih-color-teal')
  })

  it.each(['gold', 'blue', 'rose'] as const)('applies the %s class when saved', (color) => {
    localStorage.setItem('azkar_tasbih_button_color', color)
    renderView()
    const button = screen.getByRole('button', { name: /تسجيل تسبيحة/ })
    expect(button.className).toContain(`tasbih-color-${color}`)
  })

  it('falls back to teal for a missing or unknown saved value', () => {
    expect(getTasbihButtonColor()).toBe('teal')
    localStorage.setItem('azkar_tasbih_button_color', 'polka-dot')
    expect(getTasbihButtonColor()).toBe('teal')
  })
})

describe('deleting a custom phrase keeps its counts in the totals', () => {
  beforeEach(() => localStorage.clear())

  it('removes the phrase but never touches the stored counts or day total', () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-x1', word: 'ذكر مخصص', goal: 33 }]))
    localStorage.setItem('azkar_counts', JSON.stringify({ 'custom-x1': 128, 'subhan-allah': 40 }))
    localStorage.setItem('azkar_day_total', '168')

    const remaining = deleteCustomTasbih('custom-x1')
    expect(remaining).toEqual([])

    const counts = JSON.parse(localStorage.getItem('azkar_counts')!)
    expect(counts['custom-x1']).toBe(128)
    expect(counts['subhan-allah']).toBe(40)
    expect(localStorage.getItem('azkar_day_total')).toBe('168')
  })
})
