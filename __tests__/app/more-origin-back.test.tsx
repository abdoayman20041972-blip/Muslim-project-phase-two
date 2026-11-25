import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '../../src/app/App'

function finishBoot() {
  return waitFor(() => expect(screen.getByText('مسلم')).toBeTruthy(), { timeout: 4000 })
}

describe('Back from tools opened through the Home tiles', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
  })

  // «المزيد» is now an empty placeholder (قريبًا); the tools live on Home.
  for (const tool of ['السبحة', 'القبلة', 'قصص الأنبياء']) {
    it(`returns Home, not an empty More, from ${tool}`, async () => {
      render(<App />)
      await finishBoot()
      fireEvent.click(screen.getByRole('button', { name: new RegExp(tool) }))
      await waitFor(() => expect(screen.queryByRole('button', { name: new RegExp(`^${tool}$`) })).toBeNull())
      fireEvent.click(screen.getAllByRole('button', { name: /^(رجوع|العودة)$/ })[0])
      await waitFor(() => expect(screen.getByTestId('home-prayer-photo')).toBeTruthy())
      expect(screen.queryByRole('heading', { name: 'المزيد' })).toBeNull()
    })
  }

  it('المزيد stays reachable from the bar and shows the coming-soon placeholder', async () => {
    render(<App />)
    await finishBoot()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'المزيد' }))
    await screen.findByRole('heading', { name: 'المزيد' })
    expect(screen.getByText('قريبًا')).toBeTruthy()
  })
})
