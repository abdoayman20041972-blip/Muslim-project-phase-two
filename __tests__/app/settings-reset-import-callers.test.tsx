import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({
  drop: vi.fn(),
  remove: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}))
vi.mock('../../src/app/features/notifications/nativeNotifications', async (orig) => ({
  ...(await orig<typeof import('../../src/app/features/notifications/nativeNotifications')>()),
  dropPrayerPlanCarryover: m.drop,
}))
vi.mock('../../src/app/features/storage/preferencesMirror', async (orig) => ({
  ...(await orig<typeof import('../../src/app/features/storage/preferencesMirror')>()),
  removeFromMirror: m.remove,
  replaceMirror: m.replace,
}))

import { SettingsView } from '../../src/app/features/settings/SettingsView'
import { ConfirmDialogProvider } from '../../src/app/components/confirm-dialog'

function renderPrivacy() {
  return render(
    <ConfirmDialogProvider>
      <SettingsView darkMode={false} appearance="light" onAppearance={() => {}} onBack={() => {}} entry={{ category: 'privacy', at: 1 }} />
    </ConfirmDialogProvider>,
  )
}
const backup = (data: Record<string, string>) =>
  new File([JSON.stringify({ format: 'muslim-local-backup', version: 2, data })], 'b.json', { type: 'application/json' })
async function doImport(data: Record<string, string>) {
  const { container } = renderPrivacy()
  const input = container.querySelector('input[type=file]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [backup(data)] } })
  fireEvent.click(await screen.findByText('تأكيد'))
}

describe('reset and import callers of the prayer carry-over clear', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.values(m).forEach((f) => f.mockReset())
    m.remove.mockResolvedValue(true)
    m.replace.mockResolvedValue(true)
    m.drop.mockResolvedValue(true)
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload: m.reload } })
  })

  it('reset: clears settings, drops the carry-over after the mirror, then reloads', async () => {
    localStorage.setItem('adhan_sound', 'silent')
    renderPrivacy()
    fireEvent.click(screen.getByText('إعادة الضبط'))
    fireEvent.click(await screen.findByText('تأكيد'))
    await waitFor(() => expect(m.reload).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem('adhan_sound')).toBeNull()
    expect(m.drop).toHaveBeenCalledTimes(1)
    expect(m.remove.mock.invocationCallOrder[0]).toBeLessThan(m.drop.mock.invocationCallOrder[0])
  })
  it('reset: a failed native clear shows a message and does not reload', async () => {
    m.drop.mockResolvedValue(false)
    renderPrivacy()
    fireEvent.click(screen.getByText('إعادة الضبط'))
    fireEvent.click(await screen.findByText('تأكيد'))
    await screen.findByText(/تعذّر إلغاء تنبيهات الصلاة/)
    expect(m.reload).not.toHaveBeenCalled()
  })
  it('reset: a failed mirror clear never reaches the alarm clear or the reload', async () => {
    m.remove.mockResolvedValue(false)
    renderPrivacy()
    fireEvent.click(screen.getByText('إعادة الضبط'))
    fireEvent.click(await screen.findByText('تأكيد'))
    await screen.findByText(/تعذّر مسح الإعدادات/)
    expect(m.drop).not.toHaveBeenCalled()
    expect(m.reload).not.toHaveBeenCalled()
  })
  it('import without a usable location drops the carry-over, then reloads', async () => {
    await doImport({ azkar_theme_color: 'blue' })
    await waitFor(() => expect(m.reload).toHaveBeenCalledTimes(1))
    expect(m.drop).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('azkar_theme_color')).toBe('blue')
  })
  it('import with a valid location skips the clear', async () => {
    await doImport({ azkar_coords: '{"lat":30.04,"lng":31.24}' })
    await waitFor(() => expect(m.reload).toHaveBeenCalledTimes(1))
    expect(m.drop).not.toHaveBeenCalled()
  })
  it('import without a location: a failed clear shows a message and does not reload', async () => {
    m.drop.mockResolvedValue(false)
    await doImport({ azkar_theme_color: 'blue' })
    await screen.findByText(/تعذّر إلغاء تنبيهات الصلاة القديمة/)
    expect(m.reload).not.toHaveBeenCalled()
  })
})
