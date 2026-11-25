import { useEffect } from 'react'

type TapFeedback = (kind?: 'ui' | 'tasbih' | 'tasbih-complete') => void

function kindOf(button: HTMLElement) {
  return button.dataset.sound === 'tasbih-complete' ? 'tasbih-complete' : button.dataset.sound === 'tasbih' ? 'tasbih' : 'ui'
}

/**
 * The sound plays on pointerup, the moment the finger lifts, instead of waiting for the click event
 * that follows it. A scroll or a cancelled touch fires pointercancel, so it never makes a sound.
 * Keyboard and assistive clicks (no pointer) still go through click.
 */
export function useTapSoundFeedback(tapFeedback: TapFeedback) {
  useEffect(() => {
    let lastPointerAt = 0
    const buttonOf = (event: Event) => (event.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null | undefined
    const onPointerUp = (event: PointerEvent) => {
      const button = buttonOf(event)
      // A disabled button never reaches the click handler; pointer events are not dispatched to it either.
      if (!button || button.dataset.sound === 'none' || button.disabled) return
      lastPointerAt = Date.now()
      tapFeedback(kindOf(button))
    }
    const onClick = (event: MouseEvent) => {
      // Pointer taps already played on pointerup. detail 0 marks a keyboard or assistive click.
      if (event.detail > 0 || Date.now() - lastPointerAt < 800) return
      const button = buttonOf(event)
      if (button && button.dataset.sound !== 'none') tapFeedback(kindOf(button))
    }
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('click', onClick)
    }
  }, [tapFeedback])
}
