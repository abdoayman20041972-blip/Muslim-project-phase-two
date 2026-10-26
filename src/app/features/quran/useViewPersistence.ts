import { useEffect, useState } from 'react'
import { type View } from '../../constants'
import { writeSetting } from '../../settings'

export function useViewPersistence(view: View, setLastSurah: (n: number) => void) {
  const [readerView, setReaderView] = useState<Extract<View, { name: 'mushaf-surah' }> | null>(null)

  useEffect(() => {
    if (view.name === 'mushaf-surah') {
      setReaderView(view)
      writeSetting('azkar_last_surah', String(view.number))
      setLastSurah(view.number)
      return
    }
    if (['prayer-times', 'mushaf-list', 'azkar-list', 'tasbih'].includes(view.name)) {
      setReaderView(null)
      writeSetting('azkar_last_view', view.name)
    }
  }, [view])

  return readerView
}
