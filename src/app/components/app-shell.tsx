import { Component, useEffect, useState, type ReactNode } from 'react'
import type { Section, View } from '../constants'
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
  tasbih: ReactNode
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

export function AppContent({ view, home, settings, azkarList, favorites, category, mushafList, mushafReader, mushafReaderActive, prayer, qibla, prophets, hadith, tasbih, onHome }: AppContentProps) {
  // Keep-alive: a screen that has been visited once stays MOUNTED (hidden)
  // afterwards, so going back to a tab is instant — no remount, no data
  // reload, no loading indicator, and the scroll position survives too.
  // The qibla screen is deliberately excluded: its compass sensors must stop
  // when the user leaves it.
  const [visited, setVisited] = useState<Set<string>>(() => new Set(['home', view.name]))
  useEffect(() => {
    setVisited((previous) => (previous.has(view.name) ? previous : new Set(previous).add(view.name)))
  }, [view.name])
  const keep = (name: View['name']) => view.name === name || (name !== 'qibla' && visited.has(name))
  const shell = (name: View['name'], content: ReactNode) => (
    <div className={view.name === name ? 'contents' : 'hidden'} aria-hidden={view.name !== name}>
      {content}
    </div>
  )
  return (
    <ConfirmDialogProvider>
      <main className={`app-content w-full min-w-0 max-w-md px-5 ${view.name === 'mushaf-surah' ? 'md:max-w-2xl lg:max-w-3xl' : ''} ${view.name}-spacing ${view.name === 'home' ? 'pb-16' : view.name === 'mushaf-surah' ? 'pb-24' : 'pt-5 pb-24'}`}>
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
      {keep('tasbih') && shell('tasbih', wrapScreen(tasbih, 'tasbih', onHome))}
    </main>
      </ConfirmDialogProvider>
  )
}

function NavIcon({ section }: { section: Section }) {
  if (section === 'home') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="m3.5 10.8 8.5-7 8.5 7M5.5 9.5v10h13v-10M9 19.5v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (section === 'hadith') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M12 3 4.5 7.5V10h15V7.5L12 3ZM6 11h12v7.5a1 1 0 0 1-1 1h-3v-5.5H10v5.5H7a1 1 0 0 1-1-1V11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  if (section === 'mushaf') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v18H7a2.5 2.5 0 0 0-2.5 2V5.5ZM19.5 5.5A2.5 2.5 0 0 0 17 3h-5v18h5a2.5 2.5 0 0 1 2.5 2V5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  if (section === 'tasbih') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">{[[12,5],[18,10],[18,17],[12,21],[6,17],[6,10]].map(([x,y]) => <circle key={String(x)+'-'+String(y)} cx={x} cy={y} r="1.8" stroke="currentColor" strokeWidth="1.45"/>)}</svg>
  if (section === 'more') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M12 2c.6 3.6 1.9 4.9 5.5 5.5C13.9 8.1 12.6 9.4 12 13c-.6-3.6-1.9-4.9-5.5-5.5C10.1 6.9 11.4 5.6 12 2Z" stroke="currentColor" strokeWidth="1.5"/></svg>
}

export function BottomNav({ view, onNavigate }: { view: View; onNavigate: (section: Section) => void }) {
  // In the RTL UI the first item is the rightmost item.
  const items: Array<{ section: Section; label: string }> = [
    { section: 'mushaf', label: 'المصحف' },
    { section: 'hadith', label: 'الأحاديث' },
    { section: 'home', label: 'الرئيسية' },
    { section: 'azkar', label: 'الأذكار' },
    { section: 'tasbih', label: 'السبحة' },
  ]
  const activeIndex = items.findIndex(({ section }) => {
    if (section === 'home') return view.name === 'home'
    if (section === 'hadith') return view.name === 'hadith'
    if (section === 'mushaf') return view.name === 'mushaf-list' || view.name === 'mushaf-surah'
    if (section === 'azkar') return view.name === 'azkar-list' || view.name === 'category' || view.name === 'favorites'
    return view.name === 'tasbih'
  })

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-azkar-hairline bg-azkar-card/98 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-5px_20px_hsl(var(--azkar-ink)/0.06)] backdrop-blur-lg" aria-label="التنقل الرئيسي">
      <div className="relative mx-auto w-full max-w-md px-1">
        <div className="dashboard-nav-main relative grid w-full grid-cols-5 items-center">
        {activeIndex >= 0 && <span aria-hidden="true" className="dashboard-nav-indicator" style={{ ['--nav-index' as string]: activeIndex }} />}
        {items.map(({ section, label }, index) => {
          const active = index === activeIndex
          return (
            <button key={section} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(section)}
              className={`dashboard-nav-item u-pressable relative z-10 flex min-h-12 flex-col items-center justify-center gap-1 rounded-[1rem] text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold ${active ? 'dashboard-nav-item-active text-azkar-card' : 'text-azkar-ink-soft hover:text-azkar-teal-ink'}`}>
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
