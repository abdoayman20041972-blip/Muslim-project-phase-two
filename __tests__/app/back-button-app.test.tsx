import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'

let listener: (() => void) | null = null
const exitApp = vi.fn()
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (name: string, cb: () => void) => {
      if (name === 'backButton') listener = cb
      return { remove: () => { if (name === 'backButton') listener = null } }
    }),
    exitApp: () => exitApp(),
  },
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    keys: async () => ({ keys: [] }),
    get: async () => ({ value: null }),
    set: async () => {},
    remove: async () => {},
  },
}))

import { App } from '../../src/app/App'

const press = async () => { await act(async () => { listener?.() }) }
const nav = () => within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' }))
const homeVisible = () => screen.queryByTestId('home-prayer-photo')

describe('Android hardware back (native listener, mocked bridge; real device untested)', () => {
  beforeEach(() => {
    localStorage.clear()
    listener = null
    exitApp.mockClear()
    vi.restoreAllMocks()
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
  })

  async function boot() {
    render(<App />)
    await waitFor(() => expect(screen.getByText('مسلم')).toBeTruthy(), { timeout: 4000 })
    await waitFor(() => expect(listener).toBeTruthy())
  }

  it('tab taps do not stack: back from the 4th tab goes Home, then exits', async () => {
    await boot()
    for (const name of ['الأذكار', 'المصحف', 'الأحاديث', 'المزيد', 'الأذكار', 'المصحف']) {
      fireEvent.click(nav().getByRole('button', { name }))
    }
    await press()
    await waitFor(() => expect(homeVisible()).toBeTruthy())
    expect(exitApp).not.toHaveBeenCalled()
    await press()
    expect(exitApp).toHaveBeenCalledTimes(1)
  })

  it('an in-app back arrow pops history instead of pushing', async () => {
    await boot()
    fireEvent.click(screen.getByRole('button', { name: /السبحة/ }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^(رجوع|العودة)$/ }).length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByRole('button', { name: /^(رجوع|العودة)$/ })[0])
    await waitFor(() => expect(homeVisible()).toBeTruthy())
    // History is empty now: a hardware back exits instead of bouncing back into the tool.
    await press()
    expect(exitApp).toHaveBeenCalledTimes(1)
  })
})
