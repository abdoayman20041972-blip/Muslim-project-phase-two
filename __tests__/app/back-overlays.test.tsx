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
