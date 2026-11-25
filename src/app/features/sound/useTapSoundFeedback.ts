import { useEffect } from 'react'

type TapFeedback = (kind?: 'ui' | 'tasbih' | 'tasbih-complete') => void

function kindOf(button: HTMLElement) {
  return button.dataset.sound === 'tasbih-complete' ? 'tasbih-complete' : button.dataset.sound === 'tasbih' ? 'tasbih' : 'ui'
}

/**
 * The sound plays on pointerdown for navigation and the dhikr pad, and on pointerup for other buttons, instead of waiting
 * for the click event that follows. A scroll or a cancelled touch fires pointercancel, so it never makes a sound.
 * Keyboard and assistive clicks (no pointer) still go through click.
 */
export function useTapSoundFeedback(tapFeedback: TapFeedback) {
  useEffect(() => {
    let lastPointerAt = 0
    const buttonOf = (event: Event) => (event.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null | undefined
    // Controls that are never the start of a scroll (bottom navigation, header buttons, the dhikr pad) sound on
    // pointerdown, the moment the finger lands, which is the earliest a tap can be heard. Other buttons sit in
    // scrolling lists, so they sound on pointerup; a scroll cancels the pointer and stays silent.
    const isEarly = (button: HTMLElement) => button.dataset.sound === 'tasbih' || button.dataset.sound === 'tasbih-complete' || !!button.closest('nav, header, [data-sound-early]')
    let playedOnDown: Element | null = null
    const onPointerDown = (event: PointerEvent) => {
      const button = buttonOf(event)
      if (!button || button.dataset.sound === 'none' || button.disabled || !isEarly(button)) return
      lastPointerAt = Date.now()
      playedOnDown = button
      tapFeedback(kindOf(button))
    }
    const onPointerUp = (event: PointerEvent) => {
      const button = buttonOf(event)
      // A disabled button never reaches the click handler; pointer events are not dispatched to it either.
      if (!button || button.dataset.sound === 'none' || button.disabled) return
      if (playedOnDown === button) { playedOnDown = null; lastPointerAt = Date.now(); return }
      playedOnDown = null
      lastPointerAt = Date.now()
      tapFeedback(kindOf(button))
    }
    const onClick = (event: MouseEvent) => {
      // Pointer taps already played on pointerup. detail 0 marks a keyboard or assistive click.
      if (event.detail > 0 || Date.now() - lastPointerAt < 800) return
      const button = buttonOf(event)
      if (button && button.dataset.sound !== 'none') tapFeedback(kindOf(button))
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('click', onClick)
    }
  }, [tapFeedback])
}
