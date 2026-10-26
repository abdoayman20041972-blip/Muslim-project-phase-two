import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialogProvider, useConfirmDialog } from './confirm-dialog'

function OpenButtons() {
  const { confirm, alert } = useConfirmDialog()
  return (
    <>
      <button type="button" onClick={() => void confirm({ title: 'عنوان', message: 'رسالة التأكيد' })}>افتح confirm</button>
      <button type="button" onClick={() => void alert({ title: 'تنبيه', message: 'رسالة التنبيه' })}>افتح alert</button>
    </>
  )
}

function ConfirmResolver({ onResult }: { onResult: (value: boolean) => void }) {
  const { confirm } = useConfirmDialog()
  return <button type="button" onClick={async () => onResult(await confirm({ message: 'هل أنت متأكد؟' }))}>confirm</button>
}

function AlertResolver({ onResolved }: { onResolved: () => void }) {
  const { alert } = useConfirmDialog()
  return <button type="button" onClick={async () => { await alert({ message: 'تنبيه' }); onResolved() }}>alert</button>
}

describe('ConfirmDialogProvider', () => {
  it('confirm() shows the supplied title and message', () => {
    render(<ConfirmDialogProvider><OpenButtons /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'افتح confirm' }))
    expect(screen.getByRole('heading', { name: 'عنوان' })).toBeInTheDocument()
    expect(screen.getByText('رسالة التأكيد')).toBeInTheDocument()
  })

  it('confirming resolves Promise<true>', async () => {
    let result: boolean | undefined
    render(<ConfirmDialogProvider><ConfirmResolver onResult={(value) => { result = value }} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await Promise.resolve()
    expect(result).toBe(true)
  })

  it('cancelling resolves Promise<false>', async () => {
    let result: boolean | undefined
    render(<ConfirmDialogProvider><ConfirmResolver onResult={(value) => { result = value }} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    await Promise.resolve()
    expect(result).toBe(false)
  })

  it('Escape in confirm resolves false', async () => {
    let result: boolean | undefined
    render(<ConfirmDialogProvider><ConfirmResolver onResult={(value) => { result = value }} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    await Promise.resolve()
    expect(result).toBe(false)
  })

  it('alert() shows one button and no cancel button', () => {
    render(<ConfirmDialogProvider><OpenButtons /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'افتح alert' }))
    expect(screen.getByRole('button', { name: 'حسنًا' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إلغاء' })).not.toBeInTheDocument()
  })

  it('the alert button resolves the Promise without a value', async () => {
    let resolved = false
    render(<ConfirmDialogProvider><AlertResolver onResolved={() => { resolved = true }} /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'alert' }))
    fireEvent.click(screen.getByRole('button', { name: 'حسنًا' }))
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('danger applies the warning class and normal confirm does not', () => {
    function DangerHarness() {
      const { confirm } = useConfirmDialog()
      return (
        <>
          <button type="button" onClick={() => void confirm({ message: 'خطر', danger: true })}>danger</button>
          <button type="button" onClick={() => void confirm({ message: 'عادي' })}>normal</button>
        </>
      )
    }

    const { unmount } = render(<ConfirmDialogProvider><DangerHarness /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'danger' }))
    expect(screen.getByRole('button', { name: 'تأكيد' })).toHaveClass('border-red-200', 'text-red-600')
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    unmount()

    render(<ConfirmDialogProvider><DangerHarness /></ConfirmDialogProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'normal' }))
    expect(screen.getByRole('button', { name: 'تأكيد' })).not.toHaveClass('border-red-200', 'text-red-600')
  })
})
