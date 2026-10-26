import { useEffect } from 'react'

type TapFeedback = (kind?: 'ui' | 'tasbih' | 'tasbih-complete') => void

export function useTapSoundFeedback(tapFeedback: TapFeedback) {
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const b = (e.target as HTMLElement | null)?.closest('button')
      if (b && !b.disabled && b.dataset.sound !== 'none')
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
