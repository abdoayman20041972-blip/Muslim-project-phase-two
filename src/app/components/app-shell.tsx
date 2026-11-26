import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { hasBottomNav, type Section, type View } from '../constants'
import { ConfirmDialogProvider } from './confirm-dialog'

export type AppContentProps = {
  view: View
  home: ReactNode
  settings: ReactNode
  azkarList: ReactNode
  favorites: ReactNode
  category: ReactNode
  mushafList: ReactNode
  mushafReader: ReactNode
  mushafReaderActive: boolean
  prayer: ReactNode
  qibla?: ReactNode
  prophets?: ReactNode
  hadith?: ReactNode
  hadithDetailOpen?: boolean
  tasbih: ReactNode
  more?: ReactNode
  onHome: () => void
}

export type ScreenErrorBoundaryProps = {
  resetKey: string
  onHome: () => void
  showHome?: boolean
  children: ReactNode
}

type ScreenErrorBoundaryState = {
  error: Error | null
}

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.error('ScreenErrorBoundary:', error)
  }

  componentDidUpdate(prevProps: ScreenErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  private retry = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <section dir="rtl" role="alert" className="flex w-full flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-azkar-gold-tint text-2xl" aria-hidden="true">!</div>
          <h1 className="font-amiri text-2xl font-bold text-azkar-teal-ink">حدث خطأ في هذه الشاشة</h1>
          <p className="max-w-md text-sm leading-6 text-azkar-ink-soft">{this.props.showHome === false ? 'يمكنك استخدام شريط التنقل بالأسفل.' : 'يمكنك إعادة المحاولة أو العودة إلى الرئيسية.'}</p>
          <div className="flex w-full max-w-xs gap-3">
            <button type="button" onClick={this.retry} className="u-pressable flex-1 rounded-xl bg-azkar-teal px-4 py-2.5 text-sm font-bold text-azkar-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">إعادة المحاولة</button>
            {this.props.showHome !== false && <button type="button" onClick={this.props.onHome} className="u-pressable flex-1 rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-2.5 text-sm font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">الرئيسية</button>}
          </div>
        </section>
      )
    }
    return this.props.children
  }
}

function wrapScreen(content: ReactNode, resetKey: string, onHome: () => void, showHome = true) {
  return <ScreenErrorBoundary resetKey={resetKey} onHome={onHome} showHome={showHome}>{content}</ScreenErrorBoundary>
}

export function AppContent({ view, home, settings, azkarList, favorites, category, mushafList, mushafReader, mushafReaderActive, prayer, qibla, prophets, hadith, tasbih, more, onHome, hadithDetailOpen }: AppContentProps) {
  // Keep-alive: a screen that has been visited once stays MOUNTED (hidden)
  // afterwards, so going back to a tab is instant — no remount, no data
  // reload, no loading indicator, and the scroll position survives too.
  // The qibla screen is deliberately excluded: its compass sensors must stop
  // when the user leaves it.
  // Tablet classes on <html>, set from the measured width. The old Android
  // System WebView on tablets drops @media (width>=...) rules, so tablet layout
  // cannot depend on media queries.
  useEffect(() => {
    const apply = () => {
      const w = document.documentElement.clientWidth || window.innerWidth
      const list = document.documentElement.classList
      if (w >= 600) list.add('tab'); else list.remove('tab')
      if (w >= 1000) list.add('tabw'); else list.remove('tabw')
    }
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])
  const [visited, setVisited] = useState<Set<string>>(() => new Set(['home', view.name]))
  useEffect(() => {
    setVisited((previous) => (previous.has(view.name) ? previous : new Set(previous).add(view.name)))
  }, [view.name])
  // All kept-alive screens share ONE document scroll, so without this a screen
  // opened from a scrolled Home inherited Home's scroll offset (Azkar opening
  // mid-list). Each screen now remembers its own offset: a screen is entered at
  // the top, and only a return to its parent restores where the user was.
  const scrollMemory = useRef<Record<string, number>>({})
  const lastView = useRef<string>(view.name)
  useLayoutEffect(() => {
    const prev = lastView.current
    if (prev === view.name) return
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') { lastView.current = view.name; return }
    scrollMemory.current[prev] = window.scrollY || 0
    const restoreFrom: Record<string, string[]> = {
      home: ['prayer-times', 'mushaf-list', 'mushaf-surah', 'azkar-list', 'category', 'tasbih', 'qibla', 'prophets', 'hadith', 'more', 'settings', 'favorites'],
      'azkar-list': ['category', 'favorites'],
      'mushaf-list': ['mushaf-surah'],
      more: ['tasbih', 'settings', 'qibla', 'prophets'],
    }
    const back = restoreFrom[view.name]?.includes(prev)
    window.scrollTo(0, back ? scrollMemory.current[view.name] || 0 : 0)
    lastView.current = view.name
  }, [view.name])
  const keep = (name: View['name']) => view.name === name || (name !== 'qibla' && visited.has(name))
  const shell = (name: View['name'], content: ReactNode) => (
    <div className={view.name === name ? 'contents' : 'hidden'} aria-hidden={view.name !== name}>
      {content}
    </div>
  )
  // Bottom padding follows the chrome: screens with the bar clear it, inner
  // screens (no bar) only need a small end margin.
  const barVisible = hasBottomNav(view) && !(view.name === 'hadith' && hadithDetailOpen)
  const pad = view.name === 'home' ? 'pb-16' : view.name === 'mushaf-surah' ? 'pb-24' : barVisible ? 'pt-5 pb-24' : 'pt-5 pb-8'
  return (
    <ConfirmDialogProvider>
      <main className={`app-content w-full min-w-0 max-w-md px-5 ${view.name === 'mushaf-surah' ? 'md:max-w-2xl lg:max-w-3xl' : 'md:max-w-xl lg:max-w-2xl'} ${view.name}-spacing ${view.name === 'hadith' && hadithDetailOpen ? 'hadith-detail' : ''} ${pad}`}>
      {keep('home') && shell('home', wrapScreen(home, 'home', onHome, false))}
      {keep('settings') && shell('settings', wrapScreen(settings, 'settings', onHome))}
      {keep('azkar-list') && shell('azkar-list', wrapScreen(azkarList, 'azkar-list', onHome))}
      {keep('favorites') && shell('favorites', wrapScreen(favorites, 'favorites', onHome))}
      {keep('category') && category != null && shell('category', wrapScreen(category, 'category', onHome))}
      {keep('mushaf-list') && shell('mushaf-list', wrapScreen(mushafList, 'mushaf-list', onHome))}
      {mushafReader && (
        <div className={mushafReaderActive ? 'contents' : 'hidden'} aria-hidden={!mushafReaderActive}>
          {wrapScreen(mushafReader, view.name, onHome)}
        </div>
      )}
      {keep('prayer-times') && shell('prayer-times', wrapScreen(prayer, 'prayer-times', onHome))}
      {view.name === 'qibla' && wrapScreen(qibla, 'qibla', onHome)}
      {keep('prophets') && shell('prophets', wrapScreen(prophets, 'prophets', onHome))}
      {keep('hadith') && shell('hadith', wrapScreen(hadith, 'hadith', onHome))}
      {more != null && keep('more') && shell('more', wrapScreen(more, 'more', onHome))}
      {keep('tasbih') && shell('tasbih', wrapScreen(tasbih, 'tasbih', onHome))}
    </main>
      </ConfirmDialogProvider>
  )
}

function NavIcon({ section }: { section: Section }) {
  if (section === 'home') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="m3.5 10.8 8.5-7 8.5 7M5.5 9.5v10h13v-10M9 19.5v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (section === 'hadith') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M12 5.5C9 3.5 5.5 3.5 3 4.5v15c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-15c-2.5-1-6-1-9 1Zm0 0v15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  if (section === 'mushaf') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v18H7a2.5 2.5 0 0 0-2.5 2V5.5ZM19.5 5.5A2.5 2.5 0 0 0 17 3h-5v18h5a2.5 2.5 0 0 1 2.5 2V5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  if (section === 'more') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">{[5,12,19].flatMap((x) => [5,12,19].map((y) => <circle key={x + '-' + y} cx={x} cy={y} r="1.6"/>))}</svg>
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M12 2c.6 3.6 1.9 4.9 5.5 5.5C13.9 8.1 12.6 9.4 12 13c-.6-3.6-1.9-4.9-5.5-5.5C10.1 6.9 11.4 5.6 12 2Z" stroke="currentColor" strokeWidth="1.5"/></svg>
}

export function BottomNav({ view, onNavigate }: { view: View; onNavigate: (section: Section) => void }) {
  // In the RTL UI the first item is the rightmost item.
  const items: Array<{ section: Section; label: string }> = [
    { section: 'mushaf', label: 'المصحف' },
    { section: 'hadith', label: 'الأحاديث' },
    { section: 'home', label: 'الرئيسية' },
    { section: 'azkar', label: 'الأذكار' },
    { section: 'more', label: 'المزيد' },
  ]
  const activeIndex = items.findIndex(({ section }) => {
    if (section === 'home') return view.name === 'home'
    if (section === 'hadith') return view.name === 'hadith'
    if (section === 'mushaf') return view.name === 'mushaf-list' || view.name === 'mushaf-surah'
    if (section === 'azkar') return view.name === 'azkar-list' || view.name === 'category' || view.name === 'favorites'
    return view.name === 'more' || view.name === 'tasbih' || view.name === 'settings'
  })

  return (
    <nav className="nav-float z-50 nav-docked"
      aria-label="التنقل الرئيسي">
      {/* v1.2.6: flat opaque nav surface — the old backdrop-blur-lg was a permanent GPU cost on every
          screen for a blur invisible at 98% alpha, and the infinite indicator animations now run on
          the home tab only (see the .nav-home rules in styles.css). */}
      {/* The gold bubble (dashboard-nav-indicator) slides to the active tab on
          every screen; off Home the bar is docked flush to the bottom edge at
          full width instead of floating. */}
      <div className="relative mx-auto w-full max-w-md px-1">
        <div className="dashboard-nav-main relative grid w-full grid-cols-5 items-center">
        {activeIndex >= 0 && <span aria-hidden="true" className="dashboard-nav-indicator" style={{ ['--nav-index' as string]: activeIndex }} />}
        {items.map(({ section, label }, index) => {
          const active = index === activeIndex
          return (
            <button key={section} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(section)}
              className={`dashboard-nav-item u-pressable relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-[1rem] text-[0.6875rem] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold ${section === 'home' ? 'dashboard-nav-home' : ''} ${active ? 'dashboard-nav-item-active' : ''}`}>
              <span className="dashboard-nav-icon relative z-10"><NavIcon section={section} /></span>
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
        </div>
      </div>
    </nav>
  )
}
