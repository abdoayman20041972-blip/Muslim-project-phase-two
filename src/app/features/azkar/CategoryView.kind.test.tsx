import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import { CategoryView } from './CategoryView'
import { AzkarJourney } from './AzkarJourney'
import type { ZikrCategory } from '../../../azkar-data'

const category: ZikrCategory = {
  id: 'mixed',
  label: 'قسم تجريبي',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [
    { id: 'mixed:item-1', text: 'سُبْحَانَ اللَّهِ', source: 'رواه مسلم', repeat: 3, reference: { book: 'مسلم', number: '٢٦٩١', grade: 'صحيح', url: 'https://sunnah.com/muslim:2691' } },
    { id: 'mixed:item-2', text: 'خبر عن فضل الاستغفار', source: 'حصن المسلم', kind: 'fadl' },
    { id: 'mixed:item-3', text: 'يُصلي على النبي بعد الأذان', source: 'حصن المسلم', kind: 'guidance' },
  ],
}

const renderView = () => render(
  <ConfirmDialogProvider>
    <CategoryView category={category} favorites={[]} onToggleFavorite={() => {}} onBack={() => {}} />
  </ConfirmDialogProvider>,
)

describe('CategoryView content kinds', () => {
  it('shows the counter only on counted dhikr and labels fadl/guidance cards', () => {
    renderView()
    expect(screen.getAllByLabelText('تسجيل مرة من الذكر').length).toBe(1)
    expect(screen.getByText('الهدف ٣ مرة')).toBeTruthy()
    expect(screen.getByText('فضل وخبر')).toBeTruthy()
    expect(screen.getByText('إرشاد وآداب')).toBeTruthy()
  })

  it('measures section progress over counted dhikr only', () => {
    renderView()
    const progress = screen.getByRole('progressbar', { name: /إكمال 0 بالمائة من القسم/ })
    expect(progress).toBeTruthy()
    expect(screen.getByLabelText('٠ من ١ أذكار مكتملة')).toBeTruthy()
  })

  it('renders the scholarly grade chip and source link', () => {
    renderView()
    expect(screen.getByText('صحيح')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'المصدر' })
    expect(link.getAttribute('href')).toBe('https://sunnah.com/muslim:2691')
  })
})

describe('CategoryView fadl-only category', () => {
  const fadlCategory: ZikrCategory = {
    id: 'fadlonly',
    label: 'قسم فضل',
    subtitle: 'اختبار',
    icon: 'spark',
    items: [
      { id: 'fadlonly:item-1', text: 'خبر أول', source: 'رواه مسلم', kind: 'fadl' },
      { id: 'fadlonly:item-2', text: 'إرشاد أول', source: 'حصن المسلم', kind: 'guidance' },
    ],
  }
  const renderFadl = () => render(
    <ConfirmDialogProvider>
      <CategoryView category={fadlCategory} favorites={[]} onToggleFavorite={() => {}} onBack={() => {}} />
    </ConfirmDialogProvider>,
  )

  it('hides the daily progress card and completion filters when nothing is countable', () => {
    renderFadl()
    expect(screen.queryByLabelText('تقدم أذكار القسم اليوم')).toBeNull()
    expect(screen.queryByText('غير المكتمل اليوم')).toBeNull()
    expect(screen.queryByText('المكتمل')).toBeNull()
    expect(screen.getByText('الكل')).toBeTruthy()
    expect(screen.getByText('المفضلة')).toBeTruthy()
  })
})

describe('AzkarJourney completion screen', () => {
  const fadlJourneyCategory: ZikrCategory = {
    id: 'fj',
    label: 'قسم فضل',
    subtitle: 'اختبار',
    icon: 'spark',
    items: [
      { id: 'fj:item-1', text: 'خبر أول', source: 'رواه مسلم', kind: 'fadl' },
      { id: 'fj:item-2', text: 'خبر ثان', source: 'رواه مسلم', kind: 'fadl' },
    ],
  }
  const renderJourney = (cat: ZikrCategory, progress: Record<string, number> = {}) => render(
    <ConfirmDialogProvider>
      <AzkarJourney category={cat} progress={progress} counterEnabled={true} autoAdvanceEnabled={false} onProgressChange={() => {}} onExit={() => {}} />
    </ConfirmDialogProvider>,
  )

  it('shows fadl items read-only and ends a fadl-only journey as reading, never 0/0', () => {
    renderJourney(fadlJourneyCategory)
    expect(screen.getByText('فضل وخبر')).toBeTruthy()
    expect(screen.queryByLabelText('تسجيل مرة من الذكر')).toBeNull()
    fireEvent.click(screen.getByLabelText('التالي'))
    fireEvent.click(screen.getByLabelText('إنهاء الرحلة'))
    expect(screen.getByText('أنهيت قراءة أذكار القسم')).toBeTruthy()
    expect(screen.queryByText(/٠ من ٠/)).toBeNull()
    expect(screen.queryByText(/أكملت/)).toBeNull()
  })

  it('keeps the counted completion summary for counted categories', () => {
    const countedCategory: ZikrCategory = {
      id: 'cj',
      label: 'قسم محسوب',
      subtitle: 'اختبار',
      icon: 'spark',
      items: [{ id: 'cj:item-1', text: 'سُبْحَانَ اللَّهِ', source: 'رواه مسلم', repeat: 1 }],
    }
    renderJourney(countedCategory, { 'cj:cj:item-1': 1 })
    fireEvent.click(screen.getByLabelText('إنهاء الرحلة'))
    expect(screen.getByText('أكملت ١ من ١')).toBeTruthy()
  })
})
