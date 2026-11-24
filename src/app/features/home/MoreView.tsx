import { Clock, Compass, Heart, Settings, ScrollText, CircleDot } from 'lucide-react'
import type { View } from '../../constants'
import { HomeTile, type TileTone } from './HomeView'

type Entry = { view: View; title: string; subtitle: string; tone: TileTone; icon: React.ReactNode }

const ENTRIES: Entry[] = [
  { view: { name: 'tasbih' }, title: 'السبحة', subtitle: 'تسبيح وذكر', tone: 'tasbih', icon: <CircleDot className="h-6 w-6" /> },
  { view: { name: 'settings' }, title: 'الإعدادات', subtitle: 'الصلاة والتنبيهات والمظهر', tone: 'more', icon: <Settings className="h-6 w-6" /> },
  { view: { name: 'favorites' }, title: 'المفضلة', subtitle: 'أذكار حفظتها', tone: 'azkar', icon: <Heart className="h-6 w-6" /> },
  { view: { name: 'prophets' }, title: 'قصص الأنبياء', subtitle: 'دروس وعِبر', tone: 'prophets', icon: <ScrollText className="h-6 w-6" /> },
  { view: { name: 'qibla' }, title: 'القبلة', subtitle: 'تحديد اتجاه القبلة', tone: 'qibla', icon: <Compass className="h-6 w-6" /> },
  { view: { name: 'prayer-times' }, title: 'المواقيت', subtitle: 'مواقيت الصلاة', tone: 'prayer', icon: <Clock className="h-6 w-6" /> },
]

/** The "More" tab: Tasbih, Settings and the secondary tools. The five main sections stay in the bottom bar. */
export function MoreView({ onOpen }: { onOpen: (view: View) => void }) {
  return (
    <div className="w-full min-w-0" data-testid="more-view">
      <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">المزيد</h1>
      <p className="mb-4 mt-1 text-[0.75rem] text-azkar-ink-soft">أدوات وأقسام ثانوية. الأقسام الأساسية في الشريط السفلي.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {ENTRIES.map((e, i) => (
          <HomeTile key={e.view.name} onClick={() => onOpen(e.view)} title={e.title} subtitle={e.subtitle} icon={e.icon} tone={e.tone} delay={i} reveal={false} />
        ))}
      </div>
    </div>
  )
}
