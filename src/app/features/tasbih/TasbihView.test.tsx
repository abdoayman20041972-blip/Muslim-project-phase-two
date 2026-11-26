import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmDialogProvider } from '../../components/confirm-dialog'
import { TasbihView } from './TasbihView'

beforeEach(() => localStorage.clear())

describe('TasbihView dialog migration', () => {
  beforeEach(() => localStorage.clear())
  it('keeps reset side effects behind the unified confirm and applies danger styling', async () => {
    const onResetWord = vi.fn()
    const onResetToday = vi.fn()

    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={3}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={onResetWord}
          onResetToday={onResetToday}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'تصفير اليوم' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'تأكيد' })).toHaveClass('text-red-600')

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onResetToday).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'تصفير اليوم' }))
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }))
    await waitFor(() => expect(onResetToday).toHaveBeenCalledTimes(1))
    expect(onResetWord).not.toHaveBeenCalled()
  })
})


  it('adds a new custom tasbih through the custom dialog', async () => {
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /إضافة/ }))
    fireEvent.change(await screen.findByLabelText('اسم الذكر'), { target: { value: 'ذكر جديد' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual([{ id: expect.any(String), word: 'ذكر جديد', goal: 42 }]))
    expect(screen.getAllByText('ذكر جديد').length).toBeGreaterThan(0)
  })

  it('updates an existing custom tasbih through the custom dialog', async () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-edit', word: 'قديم', goal: 33 }]))
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'تعديل قديم' }))
    expect(await screen.findByDisplayValue('قديم')).toBeTruthy()
    expect(screen.getByDisplayValue('33')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('اسم الذكر'), { target: { value: 'جديد' } })
    fireEvent.change(screen.getByLabelText('الهدف'), { target: { value: '77' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual([{ id: 'custom-edit', word: 'جديد', goal: 77 }]))
  })

  it('cancelling custom tasbih creation leaves data unchanged', async () => {
    const initial = [{ id: 'custom-cancel', word: 'لن يتغير', goal: 25 }]
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify(initial))
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /إضافة/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }))
    expect(JSON.parse(localStorage.getItem('azkar_custom_tasbih_list')!)).toEqual(initial)
  })

describe('TasbihView backgrounds', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => document.documentElement.classList.remove('dark'))

  const renderView = () =>
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={null}
          roundCounts={{}}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )

  it('renders only the day mosque in light mode (the night image is never fetched)', () => {
    renderView()
    const day = document.querySelector('img.tasbih-background-photo') as HTMLImageElement
    expect(day).toBeTruthy()
    expect(day.getAttribute('src')).toBe('/img/tasbih-mosque-background.webp')
    expect(document.querySelector('img.tasbih-background-photo-dark')).toBeNull()
  })

  it('renders only the genuinely dark night mosque in dark mode', () => {
    document.documentElement.classList.add('dark')
    renderView()
    const night = document.querySelector('img.tasbih-background-photo-dark') as HTMLImageElement
    expect(night).toBeTruthy()
    expect(night.getAttribute('src')).toBe('/img/tasbih-mosque-night.webp')
    expect(document.querySelector('img.tasbih-background-photo')).toBeNull()
  })

  it('swaps the background instantly when the theme toggles', async () => {
    renderView()
    expect(document.querySelector('img.tasbih-background-photo')).toBeTruthy()
    act(() => document.documentElement.classList.add('dark'))
    await waitFor(() => expect(document.querySelector('img.tasbih-background-photo-dark')).toBeTruthy())
    expect(document.querySelector('img.tasbih-background-photo')).toBeNull()
  })
})

describe('TasbihView bead illumination cycle', () => {
  beforeEach(() => localStorage.clear())

  const renderView = (roundCounts: Record<string, number>, selectedWord = 'subhanallah') =>
    render(
      <ConfirmDialogProvider>
        <TasbihView
          counts={{}}
          dayTotal={0}
          selectedWord={selectedWord}
          roundCounts={roundCounts}
          rounds={{}}
          onTap={vi.fn()}
          onResetWord={vi.fn()}
          onResetToday={vi.fn()}
          onSelectWord={vi.fn()}
          setView={vi.fn()}
        />
      </ConfirmDialogProvider>,
    )

  const litSmall = () => document.querySelectorAll('.tasbih-bead.is-lit').length
  const imamLit = () => Boolean(document.querySelector('.tasbih-imam-bead.is-lit'))

  it('renders 33 small beads plus the large imam bead', () => {
    renderView({})
    expect(document.querySelectorAll('.tasbih-bead').length).toBe(33)
    expect(document.querySelector('.tasbih-imam-bead')).toBeTruthy()
  })

  it('first tap lights the first small bead; the imam bead stays off', () => {
    renderView({ subhanallah: 1 })
    expect(litSmall()).toBe(1)
    expect(imamLit()).toBe(false)
  })

  it('goal 33 never lights the imam bead, even on the last tap of the round', () => {
    renderView({ subhanallah: 32 })
    expect(litSmall()).toBe(32)
    expect(imamLit()).toBe(false)
  })

  it('goal 34 lights the imam bead together with all small beads on the last tap', () => {
    renderView({ allahuakbar: 34 }, 'allahuakbar')
    expect(litSmall()).toBe(33)
    expect(imamLit()).toBe(true)
  })

  it('custom goal below 34 never lights the imam bead', () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-ten', word: 'لا حول ولا قوة إلا بالله', goal: 10 }]))
    renderView({ 'custom-ten': 10 }, 'custom-ten')
    expect(litSmall()).toBe(10)
    expect(imamLit()).toBe(false)
  })

  it('larger goals repeat a full 34-tap illumination cycle without resetting the count', () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-hundred', word: 'استغفر الله', goal: 100 }]))
    const { unmount } = renderView({ 'custom-hundred': 34 }, 'custom-hundred')
    expect(litSmall()).toBe(33)
    expect(imamLit()).toBe(true)
    unmount()
    renderView({ 'custom-hundred': 35 }, 'custom-hundred')
    // The tap after a full cycle starts a new illumination cycle from bead 1.
    expect(litSmall()).toBe(1)
    expect(imamLit()).toBe(false)
    expect(screen.getByText('35', { selector: '.tasbih-count' })).toBeTruthy()
  })

  it('larger goals complete the second illumination cycle at tap 68 and restart at 69', () => {
    localStorage.setItem('azkar_custom_tasbih_list', JSON.stringify([{ id: 'custom-hundred', word: 'استغفر الله', goal: 100 }]))
    const { unmount } = renderView({ 'custom-hundred': 68 }, 'custom-hundred')
    expect(litSmall()).toBe(33)
    expect(imamLit()).toBe(true)
    unmount()
    renderView({ 'custom-hundred': 69 }, 'custom-hundred')
    expect(litSmall()).toBe(1)
    expect(imamLit()).toBe(false)
  })
})
