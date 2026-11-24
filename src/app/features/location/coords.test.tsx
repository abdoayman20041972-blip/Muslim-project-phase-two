import { renderToString } from 'react-dom/server'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLocationCoords } from './coords'

function Probe() {
  const coords = useLocationCoords()
  return <div data-testid="c">{coords ? `${coords.lat},${coords.lng}` : 'none'}</div>
}

afterEach(() => localStorage.clear())

describe('useLocationCoords hydration safety', () => {
  it('renders no location on the first pass even when a location is saved, so it matches server HTML', () => {
    localStorage.setItem('azkar_coords', JSON.stringify({ lat: 30.04, lng: 31.24 }))
    expect(renderToString(<Probe />)).toContain('none')
  })

  it('loads the saved location right after mount', async () => {
    localStorage.setItem('azkar_coords', JSON.stringify({ lat: 30.04, lng: 31.24 }))
    render(<Probe />)
    expect((await screen.findByTestId('c')).textContent).toBe('30.04,31.24')
  })

  it('stays empty without a saved location and follows later changes', async () => {
    render(<Probe />)
    expect(screen.getByTestId('c').textContent).toBe('none')
    localStorage.setItem('azkar_coords', JSON.stringify({ lat: 21.42, lng: 39.83 }))
    await act(async () => { window.dispatchEvent(new CustomEvent('azkar-prayer-settings-changed')) })
    expect(screen.getByTestId('c').textContent).toBe('21.42,39.83')
  })
})
