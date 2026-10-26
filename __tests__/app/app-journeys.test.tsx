import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '../../src/app/App'

function finishBoot() {
  return waitFor(() => expect(screen.getByText('مسلم')).toBeTruthy(), { timeout: 4000 })
}

describe('App user journeys', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
  })

  it('navigates home → azkar → morning category → back', async () => {
    render(<App />)
    await finishBoot()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'الأذكار' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'أذكار الصباح' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'أذكار الصباح' }))
    await waitFor(() => expect(screen.getByText(/أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ/)).toBeTruthy())
    fireEvent.click(screen.getByLabelText('رجوع'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'أذكار الصباح' })).toBeTruthy())
  })

  it('navigates home → tasbih and records a tap in localStorage', async () => {
    render(<App />)
    await finishBoot()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'السبحة' }))
    await waitFor(() => expect(screen.getByText(/إجمالي اليوم:/)).toBeTruthy())
    const countButton = screen.getByText('من ٣٣').closest('button')
    expect(countButton).toBeTruthy()
    fireEvent.click(countButton!)
    await waitFor(() => expect(screen.getByText(/إجمالي اليوم:/)).toHaveTextContent('١'))
    await waitFor(() => expect(localStorage.getItem('azkar_day_total')).toBe('1'), { timeout: 1000 })
  })

  it('navigates home → mushaf → surah list and can filter by number', async () => {
    render(<App />)
    await finishBoot()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'المصحف' }))
    await waitFor(() => expect(screen.getByText('المصحف الشريف')).toBeTruthy())
    const input = screen.getByPlaceholderText('ابحث باسم السورة أو رقمها...')
    fireEvent.change(input, { target: { value: '1' } })
    expect(screen.getByText('الفاتحة')).toBeTruthy()
    expect(screen.queryByText('البقرة')).toBeNull()
  })

  it('shows the fixed bottom navigation and navigates to all core sections', async () => {
    render(<App />)
    await finishBoot()
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeTruthy()

    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'الأحاديث' }))
    await waitFor(() => expect(screen.getAllByText(/مواقيت الصلاة|الأحاديث/).length).toBeGreaterThan(0))

    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'المصحف' }))
    await waitFor(() => expect(screen.getByText('المصحف الشريف')).toBeTruthy())

    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'الأذكار' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'أذكار الصباح' })).toBeTruthy())

    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'السبحة' }))
    await waitFor(() => expect(screen.getAllByText('السبحة').length).toBeGreaterThan(0))
  }, 10000)
})
