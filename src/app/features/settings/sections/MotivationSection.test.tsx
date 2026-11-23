import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MotivationSection } from './MotivationSection'
import { APP_SETTINGS_KEYS } from '../../../settings'

function Harness({ initialPage = '0', initialTarget = '20', save }: { initialPage?: string; initialTarget?: string; save: (k: string, v: string) => void }) {
  const [page, setPage] = useState(initialPage)
  const [target, setTarget] = useState(initialTarget)
  return (
    <MotivationSection
      khatmahPage={page}
      setKhatmahPage={setPage}
      khatmahTarget={target}
      setKhatmahTarget={setTarget}
      save={save}
    />
  )
}

describe('khatma settings (س17)', () => {
  beforeEach(() => localStorage.clear())

  it('clamps an out-of-range page before saving and normalizes the box on blur', () => {
    const save = vi.fn()
    render(<Harness save={save} />)
    const input = screen.getByLabelText('صفحة الختمة')
    fireEvent.change(input, { target: { value: '999' } })
    expect(save).toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahPage, '604')
    fireEvent.blur(input)
    expect((input as HTMLInputElement).value).toBe('604')
  })

  it('warns about an out-of-range page while still saving the clamped value', () => {
    const save = vi.fn()
    render(<Harness save={save} />)
    const input = screen.getByLabelText('صفحة الختمة')
    fireEvent.change(input, { target: { value: '700' } })
    expect(save).toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahPage, '604')
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('never saves an emptied box while the user is still typing', () => {
    const save = vi.fn()
    render(<Harness initialPage="100" save={save} />)
    const input = screen.getByLabelText('صفحة الختمة')
    fireEvent.change(input, { target: { value: '' } })
    expect(save).not.toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahPage, '')
  })

  it('repairs an invalid value stored by an older version', () => {
    const save = vi.fn()
    render(<Harness initialPage="999" initialTarget="0" save={save} />)
    expect(save).toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahPage, '604')
    expect(save).toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahTarget, '1')
  })

  it('turns the daily target into a concrete finish estimate', () => {
    const save = vi.fn()
    render(<Harness initialPage="300" initialTarget="10" save={save} />)
    const estimate = screen.getByTestId('khatma-estimate')
    expect(estimate.textContent).toContain('المتبقي')
    expect(estimate.textContent).toContain('٣١ يومًا')
  })

  it('clamps the daily target before saving', () => {
    const save = vi.fn()
    render(<Harness save={save} />)
    const input = screen.getByLabelText('هدف الختمة اليومي')
    fireEvent.change(input, { target: { value: '0' } })
    expect(save).toHaveBeenCalledWith(APP_SETTINGS_KEYS.khatmahTarget, '1')
  })
})
