import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'
import type { ZikrCategory } from '../../src/azkar-data'
import { CategoryView } from '../../src/app/features/azkar/CategoryView'
import { AZKAR_OCCASION_KEY, AZKAR_PROGRESS_KEY, todayKey } from '../../src/app/features/azkar/azkarProgress'
import { favoriteKey } from '../../src/app/features/azkar/useFavorites'
import { APP_SETTINGS_KEYS } from '../../src/app/settings'
import { useTapSoundFeedback } from '../../src/app/features/sound/useTapSoundFeedback'
import { useAppSounds } from '../../src/app/features/sound/useAppSounds'

// Mounts the same document-level tap listener the app shell uses, so completion
// feedback (sound selection + vibration, honoring settings) is exercised end to end.
function FeedbackMount() {
  const { tapFeedback } = useAppSounds()
  useTapSoundFeedback(tapFeedback)
  return null
}

const counted: ZikrCategory = {
  id: 'morning',
  label: 'أذكار الصباح',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [{ id: 'm1', text: 'ذكر تجريبي', repeat: 2 }],
}
const mixed: ZikrCategory = {
  id: 'evening',
  label: 'أذكار المساء',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [
    { id: 'e1', text: 'ذكر محسوب', repeat: 1 },
    { id: 'e2', text: 'فضل الذكر', kind: 'fadl' },
    { id: 'e3', text: 'إرشاد عملي', kind: 'guidance' },
  ],
}
const travel: ZikrCategory = {
  id: 'travel',
  label: 'السفر والركوب',
  subtitle: 'اختبار',
  icon: 'spark',
  items: [{ id: 't1', text: 'دعاء السفر', repeat: 2 }],
}

const renderCategory = (category: ZikrCategory) => render(
  <ConfirmDialogProvider>
    <CategoryView category={category} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />
  </ConfirmDialogProvider>,
)

const vibrateSpy = () => {
  const spy = vi.fn()
  Object.defineProperty(window.navigator, 'vibrate', { value: spy, configurable: true })
  return spy
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(APP_SETTINGS_KEYS.vibration, '1')
})
afterEach(() => {
  Object.defineProperty(window.navigator, 'vibrate', { value: undefined, configurable: true })
  localStorage.clear()
})

describe('big counting button with ring indicator', () => {
  it('renders a thumb-sized button whose ring reports current progress', () => {
    renderCategory(counted)
    const button = screen.getByRole('button', { name: 'تسجيل مرة من الذكر' })
    expect(button.className).toContain('dpad-pad')
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 0 من 2' })).toBeTruthy()
    fireEvent.click(button)
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 2' })).toBeTruthy()
  })

  it('locks at the target with a completion state and completion feedback', () => {
    const spy = vibrateSpy()
    render(
      <ConfirmDialogProvider>
        <FeedbackMount />
        <CategoryView category={counted} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />
      </ConfirmDialogProvider>,
    )
    const button = screen.getByRole('button', { name: 'تسجيل مرة من الذكر' })
    fireEvent.click(button)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith([10, 18, 10])
    fireEvent.click(button)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith([35, 45, 35])
    expect(button.getAttribute('data-sound')).toBe('tasbih-complete')
    expect(screen.getByRole('button', { name: 'تم إكمال الذكر' })).toHaveProperty('disabled', true)
    expect(screen.getByText('✓ تم الإكمال')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!).days[todayKey()][favoriteKey(counted, counted.items[0])]).toBe(2)
  })

  it('stays silent when the vibration setting is off', () => {
    localStorage.setItem(APP_SETTINGS_KEYS.vibration, '0')
    const spy = vibrateSpy()
    render(
      <ConfirmDialogProvider>
        <FeedbackMount />
        <CategoryView category={counted} favorites={[]} onToggleFavorite={vi.fn()} onBack={vi.fn()} />
      </ConfirmDialogProvider>,
    )
    const button = screen.getByRole('button', { name: 'تسجيل مرة من الذكر' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('undo last tap', () => {
  it('steps back one tap, never below zero, and unlocks a completed item', () => {
    renderCategory(counted)
    const button = screen.getByRole('button', { name: 'تسجيل مرة من الذكر' })
    expect(screen.queryByRole('button', { name: 'تراجع عن آخر نقرة' })).toBeNull()
    fireEvent.click(button)
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'تم إكمال الذكر' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'تراجع عن آخر نقرة' }))
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 1 من 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('button', { name: 'تراجع عن آخر نقرة' }))
    expect(screen.getByRole('progressbar', { name: 'تقدم الذكر: 0 من 2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تراجع عن آخر نقرة' })).toBeNull()
    expect(JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!).days[todayKey()][favoriteKey(counted, counted.items[0])]).toBe(0)
  })

  it('undoes into the occasion store for situational sections', () => {
    renderCategory(travel)
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل مرة من الذكر' }))
    fireEvent.click(screen.getByRole('button', { name: 'تراجع عن آخر نقرة' }))
    expect(JSON.parse(localStorage.getItem(AZKAR_OCCASION_KEY)!).categories.travel.counts['travel:t1']).toBe(0)
    expect(localStorage.getItem(AZKAR_PROGRESS_KEY)).toBeNull()
  })
})

describe('counted dhikr versus fadl cards', () => {
  it('marks fadl and guidance cards visually and gives them no counter', () => {
    const { container } = renderCategory(mixed)
    expect(container.querySelectorAll('.azkar-fadl-card').length).toBe(1)
    expect(container.querySelectorAll('.azkar-guidance-card').length).toBe(1)
    expect(screen.getAllByRole('button', { name: 'تسجيل مرة من الذكر' }).length).toBe(1)
    expect(screen.getByText('فضل وخبر')).toBeTruthy()
    expect(screen.getByText('إرشاد وآداب')).toBeTruthy()
  })
})
