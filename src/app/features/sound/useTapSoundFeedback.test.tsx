import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useTapSoundFeedback } from './useTapSoundFeedback'

function Harness({ fn }: { fn: () => void }) {
  useTapSoundFeedback(fn)
  return (<div><nav><button data-testid="nav">n</button></nav><button data-testid="list">l</button><button data-testid="mute" data-sound="none">m</button></div>)
}
afterEach(cleanup)

describe('useTapSoundFeedback', () => {
  it('plays nav buttons on pointerdown, once', () => {
    const fn = vi.fn(); const { getByTestId } = render(<Harness fn={fn} />)
    const b = getByTestId('nav')
    fireEvent.pointerDown(b); expect(fn).toHaveBeenCalledTimes(1)
    fireEvent.pointerUp(b); fireEvent.click(b, { detail: 1 }); expect(fn).toHaveBeenCalledTimes(1)
  })
  it('plays list buttons on pointerup, not on pointerdown, and not after a cancel', () => {
    const fn = vi.fn(); const { getByTestId } = render(<Harness fn={fn} />)
    const b = getByTestId('list')
    fireEvent.pointerDown(b); expect(fn).not.toHaveBeenCalled()
    fireEvent.pointerCancel(b); expect(fn).not.toHaveBeenCalled()
    fireEvent.pointerDown(b); fireEvent.pointerUp(b); expect(fn).toHaveBeenCalledTimes(1)
  })
  it('stays silent for data-sound=none and plays keyboard clicks', () => {
    const fn = vi.fn(); const { getByTestId } = render(<Harness fn={fn} />)
    fireEvent.pointerDown(getByTestId('mute')); fireEvent.pointerUp(getByTestId('mute')); expect(fn).not.toHaveBeenCalled()
    fireEvent.click(getByTestId('list'), { detail: 0 }); expect(fn).toHaveBeenCalledTimes(1)
  })
})
