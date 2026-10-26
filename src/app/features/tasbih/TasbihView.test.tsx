import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import { TasbihView } from './TasbihView'

beforeEach(() => localStorage.clear())

describe('TasbihView dialog migration', () => {
  beforeEach(() => localStorage.clear())
  it('keeps reset side effects behind the unified confirm and applies danger styling', async () => {
    const onResetWord = vi.fn()
    const onResetToday = vi.fn()

    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={3}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={onResetWord}
          onResetToday={onResetToday}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'تصفير اليوم' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'تأكيد' })).toHaveClass('text-red-600')

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onResetToday).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'تصفير اليوم' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await waitFor(() => expect(onResetToday).toHaveBeenCalledTimes(1))
    expect(onResetWord).not.toHaveBeenCalled()
  })
})


  it('adds a new custom tasbih through the custom dialog', async () => {
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /إضافة/ }))
    fireEvent.change(await screen.findByLabelText('اسم الذكر'), { target: { value: 'ذكر جديد' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual([{ id: expect.any(String), word: 'ذكر جديد', goal: 42 }]))
    expect(screen.getAllByText('ذكر جديد').length).toBeGreaterThan(0)
  })

  it('updates an existing custom tasbih through the custom dialog', async () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-edit', word: 'قديم', goal: 33 }]))
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'تعديل قديم' }))
    expect(await screen.findByDisplayValue('قديم')).toBeTruthy()
    expect(screen.getByDisplayValue('33')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: 'جديد' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value: '77' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual([{ id: 'custom-edit', word: 'جديد', goal: 77 }]))
  })

  it('cancelling custom tasbih creation leaves data unchanged', async () => {
    const initial = [{ id: 'custom-cancel', word: 'لن يتغير', goal: 25 }]
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify(initial))
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /إضافة/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }))
    expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual(initial)
  })
