import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'

const store = new Map<string, string>()
const preferences = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  keys: vi.fn(),
}

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('@capacitor/preferences', () => ({ Preferences: preferences }))

const KEY = 'azkar_daily_ayah_time'
const reload = vi.fn()

async function setup() {
  vi.resetModules()
  const { SettingsView } = await import('../../src/app/features/settings/SettingsView')
  const { ConfirmDialogProvider } = await import('../../src/app/components/confirm-dialog')
  return render(
    <ConfirmDialogProvider>
      <SettingsView
        darkMode={false}
        appearance="light"
        onAppearance={() => {}}
        onBack={() => {}}
        entry={{ category: 'privacy', at: 1 }}
      />
    </ConfirmDialogProvider>,
  )
}

beforeEach(() => {
  store.clear()
  localStorage.clear()
  reload.mockReset()
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  preferences.get.mockReset().mockImplementation(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }))
  preferences.set.mockReset().mockImplementation(async ({ key, value }: { key: string; value: string }) => {
    store.set(key, value)
  })
  preferences.remove.mockReset().mockImplementation(async ({ key }: { key: string }) => {
    store.delete(key)
  })
  preferences.keys.mockReset().mockImplementation(async () => ({ keys: [...store.keys()] }))
})

describe('settings reset and import with the native mirror', () => {
  it('reset reloads only after native removal finished', async () => {
    store.set(KEY, '07:45')
    localStorage.setItem(KEY, '07:45')
    let release!: () => void
    preferences.remove.mockImplementation(
      ({ key }: { key: string }) =>
        new Promise<void>((resolve) => {
          release = () => {
            store.delete(key)
            resolve()
          }
        }),
    )
    const ui = await setup()
    fireEvent.click(ui.getByText('إعادة الضبط'))
    fireEvent.click(await ui.findByText('تأكيد'))
    await waitFor(() => expect(preferences.remove).toHaveBeenCalled())
    expect(reload).not.toHaveBeenCalled()
    // release every pending removal until the helper finishes
    for (let i = 0; i < 400 && reload.mock.calls.length === 0; i++) {
      release?.()
      await new Promise((r) => setTimeout(r, 0))
    }
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reset does not reload or look successful when native removal fails', async () => {
    preferences.remove.mockRejectedValue(new Error('native failure'))
    const ui = await setup()
    fireEvent.click(ui.getByText('إعادة الضبط'))
    fireEvent.click(await ui.findByText('تأكيد'))
    await ui.findByText(/لم تتم إعادة التحميل/)
    expect(reload).not.toHaveBeenCalled()
  })

  it('import does not reload or look successful when native write fails', async () => {
    preferences.set.mockRejectedValue(new Error('native failure'))
    const ui = await setup()
    const input = ui.container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(
      [JSON.stringify({ format: 'muslim-local-backup', data: { [KEY]: '11:00' } })],
      'backup.json',
      { type: 'application/json' },
    )
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify({ format: 'muslim-local-backup', data: { [KEY]: '11:00' } }) })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(await ui.findByText('تأكيد'))
    await ui.findByText(/لم تتم إعادة التحميل/)
    expect(reload).not.toHaveBeenCalled()
  })

  it('import reloads after native storage matches the imported data', async () => {
    store.set(KEY, 'old')
    const ui = await setup()
    const input = ui.container.querySelector('input[type="file"]') as HTMLInputElement
    const text = JSON.stringify({ format: 'muslim-local-backup', data: { azkar_theme_color: 'blue' } })
    const file = new File([text], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => text })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(await ui.findByText('تأكيد'))
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(store.has(KEY)).toBe(false)
    expect(store.get('azkar_theme_color')).toBe('blue')
  })
})
