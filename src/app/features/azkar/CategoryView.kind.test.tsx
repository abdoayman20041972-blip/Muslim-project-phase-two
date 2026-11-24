import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import { CategoryView } from './CategoryView'
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
