import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { QiblaView } from './QiblaView'
import { APP_SETTINGS_KEYS, writeSetting } from '../../settings'

describe('QiblaView empty state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('offers a direct path to the location settings when no location is stored', () => {
    const onBack = vi.fn()
    const onOpenLocation = vi.fn()
    const { getByRole, getByText } = render(<QiblaView onBack={onBack} onOpenLocation={onOpenLocation} />)
    getByText('حدد موقعك أولًا')

    fireEvent.click(getByRole('button', { name: 'تحديد الموقع' }))
    expect(onOpenLocation).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()

    // The old way out still works.
    fireEvent.click(getByRole('button', { name: 'رجوع' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders the compass, not the empty state, when coordinates are stored', () => {
    writeSetting(APP_SETTINGS_KEYS.coords, JSON.stringify({ lat: 30.0444, lng: 31.2357 }))
    const { container, queryByText } = render(<QiblaView onBack={() => {}} onOpenLocation={() => {}} />)
    expect(container.querySelector('.q2-compass-shell')).not.toBeNull()
    expect(queryByText('حدد موقعك أولًا')).toBeNull()
  })
})
