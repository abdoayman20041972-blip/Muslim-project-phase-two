import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppContent, type AppContentProps } from '../../src/app/components/app-shell'
import { backHandlerCount, runTopBackHandler, useBackHandler } from '../../src/app/backStack'

function Overlay() {
  useBackHandler(true, () => undefined)
  return <div>overlay</div>
}
const base = (view: AppContentProps['view']): AppContentProps => ({
  view,
  home: <div>home</div>, settings: null, azkarList: null, favorites: null, category: null, mushafList: null,
  mushafReader: null, mushafReaderActive: false, prayer: null, qibla: null, prophets: null,
  hadith: <Overlay />, tasbih: null, more: null, onHome: () => undefined, hadithDetailOpen: false,
} as AppContentProps)

describe('app shell supplies the screen-active flag', () => {
  it('a kept-alive hidden screen holds no back handler; it returns when the screen is shown again', () => {
    const { rerender } = render(<AppContent {...base({ name: 'hadith' } as never)} />)
    expect(backHandlerCount()).toBe(1)
    rerender(<AppContent {...base({ name: 'home' } as never)} />)
    expect(backHandlerCount()).toBe(0)
    expect(runTopBackHandler()).toBe(false)
    rerender(<AppContent {...base({ name: 'hadith' } as never)} />)
    expect(backHandlerCount()).toBe(1)
  })
  it('the reader screen follows mushafReaderActive', () => {
    const p = (active: boolean) => ({ ...base({ name: 'mushaf-surah', number: 1 } as never), mushafReader: <Overlay />, mushafReaderActive: active })
    const { rerender } = render(<AppContent {...p(true)} />)
    expect(backHandlerCount()).toBe(1)
    rerender(<AppContent {...p(false)} />)
    expect(backHandlerCount()).toBe(0)
  })
})
