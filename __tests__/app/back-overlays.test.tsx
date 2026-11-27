import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ConfirmDialogProvider, useConfirmDialog } from '../../src/app/components/confirm-dialog'
import { backHandlerCount, runTopBackHandler } from '../../src/app/backStack'

function Opener({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm } = useConfirmDialog()
  return <button onClick={() => void confirm({ message: 'هل أنت متأكد؟' }).then(onResult)}>open</button>
}

describe('hardware back closes overlays first', () => {
  it('closes an open confirm dialog as a cancel, then nothing is left', async () => {
    const results: boolean[] = []
    render(
      <ConfirmDialogProvider>
        <Opener onResult={(v) => results.push(v)} />
      </ConfirmDialogProvider>,
    )
    expect(backHandlerCount()).toBe(0)
    await act(async () => { screen.getByText('open').click() })
    expect(screen.getByText('هل أنت متأكد؟')).toBeTruthy()
    expect(backHandlerCount()).toBe(1)
    await act(async () => { runTopBackHandler() })
    expect(screen.queryByText('هل أنت متأكد؟')).toBeNull()
    expect(results).toEqual([false])
    expect(backHandlerCount()).toBe(0)
    expect(runTopBackHandler()).toBe(false)
  })
})

describe('opening a dialog does not remount the app tree', () => {
  it('keeps child state while a dialog opens and closes', async () => {
    function Counter() {
      const [n, setN] = useState(0)
      const { alert } = useConfirmDialog()
      return <button onClick={() => { setN(n + 1); void alert({ message: 'تنبيه' }) }}>{'n=' + n}</button>
    }
    render(
      <ConfirmDialogProvider>
        <Counter />
      </ConfirmDialogProvider>,
    )
    await act(async () => { screen.getByText('n=0').click() })
    expect(screen.getByText('تنبيه')).toBeTruthy()
    expect(screen.getByText('n=1')).toBeTruthy()
    // Back closes the dialog; the state survived the open dialog (no remount).
    await act(async () => { runTopBackHandler() })
    expect(screen.getByText('n=1')).toBeTruthy()
  })
})
