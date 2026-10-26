import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TasbihWord } from '../../constants'
import { useCustomTasbihDialog } from './custom-tasbih-dialog'

function Harness({ existing = null }: { existing?: TasbihWord | null }) {
  const { dialog, open } = useCustomTasbihDialog()
  return (
    <>
      <button onClick={() => void open(existing)}>فتح</button>
      {dialog}
    </>
  )
}

describe('useCustomTasbihDialog', () => {
  beforeEach(() => localStorage.clear())
  it('opens with existing values', async () => {
    const existing = { id: 'custom-existing', word: 'سبحان الله', goal: 99 } as TasbihWord
    render(<Harness existing={existing} />)
    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    expect(screen.getByDisplayValue('سبحان الله')).toBeTruthy()
    expect(screen.getByDisplayValue('99')).toBeTruthy()
  })

  it('shows a required-name error and stays open', async () => {
    let resolved = false
    function ResolveHarness() {
      const { dialog, open } = useCustomTasbihDialog()
      return (
        <>
          <button onClick={() => void open(null).then(() => { resolved = true })}>فتح</button>
          {dialog}
        </>
      )
    }
    render(<ResolveHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    expect(screen.getByText('الاسم مطلوب.')).toBeTruthy()
    await Promise.resolve()
    expect(resolved).toBe(false)
  })

  it.each(['abc', '0', '-1', '10001'])('rejects invalid goal %s', async (value) => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: 'ذكر صالح' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    expect(screen.getByText('أدخل رقمًا بين 1 و10000.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('rejects duplicate names', async () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-1', word: 'ذكر موجود', goal: 33 }]))
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: ' ذكر   موجود ' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    expect(screen.getByText('هذا الذكر موجود بالفعل.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('resolves valid input with the trimmed word and numeric goal', async () => {
    let result: { word: string; goal: number } | null | undefined
    function ResolveHarness() {
      const { dialog, open } = useCustomTasbihDialog()
      return (
        <>
          <button onClick={() => void open(null).then((value) => { result = value })}>فتح</button>
          {dialog}
        </>
      )
    }
    render(<ResolveHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: '  ذكر جديد  ' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(result).toEqual({ word: 'ذكر جديد', goal: 100 }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('resolves null on cancel, Escape, and outside click', async () => {
    let results: Array<{ word: string; goal: number } | null> = []
    function ResolveHarness() {
      const { dialog, open } = useCustomTasbihDialog()
      return (
        <>
          <button onClick={() => void open(null).then((value) => results.push(value))}>فتح</button>
          {dialog}
        </>
      )
    }
    render(<ResolveHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    await waitFor(() => expect(results).toEqual([null]))

    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(results).toEqual([null, null]))

    fireEvent.click(screen.getByRole('button', { name: 'فتح' }))
    fireEvent.mouseDown(screen.getByRole('presentation'))
    await waitFor(() => expect(results).toEqual([null, null, null]))
  })
})
