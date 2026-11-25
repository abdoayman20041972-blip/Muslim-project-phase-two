import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '../../src/app/App'

async function openMore() {
  await waitFor(() => expect(screen.getByText('مسلم')).toBeTruthy(), { timeout: 4000 })
  fireEvent.click(within(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).getByRole('button', { name: 'المزيد' }))
  await screen.findByRole('heading', { name: 'المزيد' })
}

describe('Back from tools opened through More', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
  })

  for (const tool of ['السبحة', 'المفضلة', 'القبلة', 'قصص الأنبياء']) {
    it(`returns to More, not Home, from ${tool}`, async () => {
      render(<App />)
      await openMore()
      fireEvent.click(await screen.findByRole('button', { name: new RegExp(tool) }))
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'المزيد' })).toBeNull())
      fireEvent.click(screen.getAllByRole('button', { name: /^(رجوع|العودة)$/ })[0])
      expect(await screen.findByRole('heading', { name: 'المزيد' })).toBeTruthy()
    })
  }
})
