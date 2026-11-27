import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FavoritesView } from '../../src/app/features/azkar/FavoritesView'
import { parseReference } from '../../src/app/features/azkar/zikrReference'
import { toArabicDigits } from '../../src/app/constants'

const item = { id: 'i1', text: 'سبحان الله', source: 'رواه مسلم' } as never
const category = { id: 'c1', label: 'أذكار', subtitle: '', items: [item] } as never

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
})

describe('FavoritesView copy', () => {
  it('copies the dhikr text together with its displayed source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<FavoritesView favorites={[{ key: 'c1:i1', category, item }]} onToggleFavorite={() => {}} onBack={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'نسخ الذكر' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const parsed = parseReference('رواه مسلم')
    expect(parsed.ignored).toBe(false)
    expect(writeText).toHaveBeenCalledWith(`${toArabicDigits('سبحان الله')}\n${toArabicDigits(parsed.value)}`)
  })
})
