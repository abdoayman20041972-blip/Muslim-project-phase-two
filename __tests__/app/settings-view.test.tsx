import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsView } from '../../src/app/features/settings/SettingsView'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'
import { AZKAR_PROGRESS_KEY, todayKey } from '../../src/app/features/azkar/azkarProgress'
import { getTasbihWords } from '../../src/app/constants'
import { QURAN_AUDIO_RECITERS } from '../../src/app/features/quran/quranAudioPlayback'

vi.mock('../../src/app/features/quran/useQuranPreferences', () => ({
  useQuranPreferences: () => ({
    fontSize: 'md',
    setFontSize: vi.fn(),
    reciter: 'ar.minshawi',
    setReciter: vi.fn(),
    layout: 'scroll',
    setLayout: vi.fn(),
    fontConfig: { size: '1rem', lineHeight: 2 },
  }),
}))

vi.mock('../../src/app/features/notifications/notificationPermission', () => ({
  getNotificationPermission: () => 'default',
  requestNotificationPermission: vi.fn(async () => 'granted'),
}))

const props = {
  darkMode: false,
  appearance: 'light' as const,
  onAppearance: vi.fn(),
  onBack: vi.fn(),
}

function openCategory(name: string) {
  // Match the category card by its bold title so descriptions (e.g. the
  // device card also mentions “الإشعارات”) can not produce duplicate matches.
  fireEvent.click(screen.getByText(name, { selector: 'b' }).closest('button')!)
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  render(<ConfirmDialogProvider><SettingsView {...props} /></ConfirmDialogProvider>)
})

describe('SettingsView smoke coverage', () => {
  it('cancels and confirms resetting defaults without changing the requested semantics', async () => {
    localStorage.setItem('azkar_theme_color', 'gold')
    openCategory('الخصوصية والبيانات')
    fireEvent.click(screen.getByRole('button', { name: 'إعادة الضبط' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(localStorage.getItem('azkar_theme_color')).toBe('gold')
    fireEvent.click(screen.getByRole('button', { name: 'إعادة الضبط' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await waitFor(() => expect(localStorage.getItem('azkar_theme_color')).toBeNull())
  })

  it('clears azkar progress only after confirmation and closes the success alert', async () => {
    const key = 'dialog-azkar-key'
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: { [todayKey()]: { [key]: 1 } } }))
    fireEvent.click(screen.getByText('الأذكار', { selector: 'b' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: /التقدم والبيانات/ }))
    fireEvent.click(screen.getByRole('button', { name: 'مسح تقدم اليوم' }))
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!)).toEqual({ version: 2, days: { [todayKey()]: { [key]: 1 } } })
    fireEvent.click(screen.getByRole('button', { name: 'مسح تقدم اليوم' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('تم مسح تقدم اليوم.')
    fireEvent.click(screen.getByRole('button', { name: 'حسنًا' }))
    expect(JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY)!)).toEqual({ version: 2, days: {} })
  })

  it('shows and closes the duplicate custom tasbih alert without adding data', async () => {
    fireEvent.click(screen.getByText('السبحة', { selector: 'b' }).closest('button')!)
    const existing = getTasbihWords()[0].word
    fireEvent.change(screen.getByPlaceholderText('مثال: الصلاة على النبي'), { target: { value: existing } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('هذه العبارة موجودة بالفعل.')
    fireEvent.click(screen.getByRole('button', { name: 'حسنًا' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem('azkar_custom_tasbih')).toBeNull()
  })

  it('opens the general category and exposes an appearance control', () => {
    openCategory('عام')
    expect(screen.getByText('عام')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'داكن' })).toBeTruthy()
  })

  it('opens the Quran category and exposes the reciter select', () => {
    fireEvent.click(screen.getByText('المصحف', { selector: 'b' }).closest('button')!)
    expect(screen.getAllByText('المصحف')[0]).toBeTruthy()
    const select = screen.getByRole('combobox', { name: 'قارئ المصحف' }) as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.value)).toEqual([...QURAN_AUDIO_RECITERS])
  })

  it('opens the azkar category and exposes the internal settings categories', () => {
    fireEvent.click(screen.getByText('الأذكار', { selector: 'b' }).closest('button')!)
    expect(screen.getAllByText('الأذكار')[0]).toBeTruthy()
    expect(screen.getByRole('button', { name: /العداد والتقدم/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /رحلة الأذكار/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /التفاعل/ })).toBeNull()
    expect(screen.getByRole('button', { name: /التقدم والبيانات/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /تجربة القراءة/ })).toBeNull()
  })

  it('switches Azkar settings categories without changing their existing controls', () => {
    fireEvent.click(screen.getByText('الأذكار', { selector: 'b' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: /العداد والتقدم/ }))
    expect(screen.getByRole('switch', { name: 'عداد الأذكار' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /رحلة الأذكار/ }))
    expect(screen.getByRole('switch', { name: 'الانتقال التلقائي' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /التقدم والبيانات/ }))
    expect(screen.getByRole('button', { name: 'مسح تقدم اليوم' })).toBeTruthy()
  })

  it('opens the tasbih category and exposes the tasbih sound toggle', () => {
    fireEvent.click(screen.getByText('السبحة', { selector: 'b' }).closest('button')!)
    expect(screen.getAllByText('السبحة')[0]).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'صوت التسبيح' })).toBeTruthy()
  })

  it('keeps prayer notification switches out of the Prayer category', () => {
    fireEvent.click(screen.getByText('الصلاة', { selector: 'b' }).closest('button')!)
    expect(screen.getAllByText('الصلاة')[0]).toBeTruthy()
    expect(screen.getByRole('button', { name: 'حنفي' })).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'التذكير قبل الصلاة' })).toBeNull()
    expect(screen.queryByRole('switch', { name: 'إشعار دخول الوقت' })).toBeNull()
  })

  it('opens notifications and exposes independent prayer controls', async () => {
    openCategory('الإشعارات')
    expect(screen.getByText('الإشعارات')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'السماح' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'تذكير الصلاة' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'قبل الصلاة بـ٥ دقائق' })).toBeTruthy()
    expect(screen.queryByText('تذكير الأذكار')).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'تذكير الصلاة' }))
    fireEvent.click(screen.getByRole('switch', { name: 'قبل الصلاة بـ٥ دقائق' }))
    await waitFor(() => {
      expect(localStorage.getItem('azkar_prayer_time_notifications')).toBe('0')
      expect(localStorage.getItem('azkar_reminders_on')).toBe('1')
    })
  })

  it('exposes Quran reading reminder with an independent daily time', async () => {
    openCategory('الإشعارات')
    const toggle = screen.getByRole('switch', { name: 'قراءة القرآن' })
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle)
    const time = await screen.findByLabelText('وقت تذكير قراءة القرآن') as HTMLInputElement
    fireEvent.change(time, { target: { value: '21:30' } })
    await waitFor(() => {
      expect(localStorage.getItem('azkar_quran_reading_reminder')).toBe('1')
      expect(localStorage.getItem('azkar_quran_reading_reminder_time')).toBe('21:30')
    })
  })

  it('exposes the approved daily ayah and morning/evening azkar notification controls', async () => {
    openCategory('الإشعارات')
    expect(screen.getByRole('switch', { name: 'آية اليوم' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'أذكار الصباح' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'أذكار المساء' })).toBeTruthy()
    expect(screen.queryByText('تنبيهات الصيام')).toBeNull()
    expect(screen.queryByText('تنبيه الشروق والغروب')).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'آية اليوم' }))
    fireEvent.click(screen.getByRole('switch', { name: 'أذكار الصباح' }))
    fireEvent.click(screen.getByRole('switch', { name: 'أذكار المساء' }))

    await waitFor(() => {
      expect(localStorage.getItem('azkar_daily_ayah_notifications')).toBe('1')
      expect(localStorage.getItem('azkar_azkar_morning_reminders')).toBe('1')
      expect(localStorage.getItem('azkar_azkar_evening_reminders')).toBe('1')
    })
  })

  it('does not show notification settings in the general category', () => {
    openCategory('عام')
    expect(screen.queryByText('تذكير الأذكار')).toBeNull()
  })

  it('opens the motivation category and exposes the khatmah page input', () => {
    openCategory('التحفيز')
    expect(screen.getByText('التحفيز')).toBeTruthy()
    expect(screen.getByRole('spinbutton', { name: 'صفحة الختمة' })).toBeTruthy()
  })

  it('opens the privacy category', () => {
    openCategory('الخصوصية والبيانات')
    expect(screen.getByText('الخصوصية والبيانات')).toBeTruthy()
  })

  it('opens the about category and exposes the feedback action', () => {
    fireEvent.click(screen.getByText('حول مسلم', { selector: 'b' }).closest('button')!)
    expect(screen.getAllByText('حول مسلم')[0]).toBeTruthy()
    expect(screen.getByRole('link', { name: 'إرسال ملاحظات' })).toBeTruthy()
  })

  it('returns from a category to the main settings screen with the back button', () => {
    openCategory('عام')
    expect(screen.getByText('عام')).toBeTruthy()

    const backButton = screen.getAllByRole('button', { name: '‹' })[0]
    fireEvent.click(backButton)

    expect(screen.getByText('الإعدادات')).toBeTruthy()
    expect(screen.getByText('كل التفضيلات في مكان واحد')).toBeTruthy()
  })
})
