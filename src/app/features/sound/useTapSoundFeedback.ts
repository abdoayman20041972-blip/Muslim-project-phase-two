import { useEffect } from 'react'

type TapFeedback = (kind?: 'ui' | 'tasbih' | 'tasbih-complete') => void

export function useTapSoundFeedback(tapFeedback: TapFeedback) {
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest('button')
      // No !b.disabled check: a click that completes a counter disables its button
      // synchronously (React flush) before this document listener runs, which would
      // swallow the completion feedback. Disabled buttons never dispatch clicks anyway.
      if (b && b.dataset.sound !== 'none')
        tapFeedback(
          b.dataset.sound === 'tasbih-complete'
            ? 'tasbih-complete'
            : b.dataset.sound === 'tasbih'
              ? 'tasbih'
              : 'ui',
        )
    }
    document.addEventListener('click', f)
    return () => document.removeEventListener('click', f)
  }, [tapFeedback])
}
