import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const s = vi.hoisted(() => ({ native: false, getInfo: vi.fn(), impl: (() => Promise.resolve({})) as () => Promise<unknown> }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => s.native, getPlatform: () => (s.native ? 'android' : 'web') } }))
vi.mock('@capacitor/app', () => ({ App: { getInfo: () => { s.getInfo(); return s.impl() } } }))

import { AboutSection } from '../../src/app/features/settings/sections/AboutSection'

describe('About shows the installed version', () => {
  beforeEach(() => s.getInfo.mockReset())
  afterEach(() => cleanup())
  it('web: no native version', () => {
    s.native = false
    render(<AboutSection />)
    expect(screen.getByText('Web / PWA')).toBeTruthy()
    expect(s.getInfo).not.toHaveBeenCalled()
  })
  it('Android: shows versionName and versionCode from the package, not a hardcoded string', async () => {
    s.native = true
    s.impl = () => Promise.resolve({ version: '1.3.0', build: '2', name: 'x', id: 'y' })
    render(<AboutSection />)
    expect(await screen.findByText('أندرويد 1.3.0 (2)')).toBeTruthy()
    expect(screen.queryByText(/1\.1\.0/)).toBeNull()
  })
  it('Android: if the version cannot be read it says so by showing only the platform', async () => {
    s.native = true
    s.impl = () => Promise.reject(new Error('no'))
    render(<AboutSection />)
    expect(await screen.findByText('أندرويد')).toBeTruthy()
  })
})
