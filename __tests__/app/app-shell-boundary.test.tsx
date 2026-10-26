import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState, type ReactNode } from 'react'
import { AppContent, ScreenErrorBoundary } from '../../src/app/components/app-shell'
import type { View } from '../../src/app/constants'

function ThrowingScreen(): never {
  throw new Error('broken screen')
}
function HealthyScreen({ label }: { label: string }): ReactNode {
  return <div>{label}</div>
}
function contentProps(view: View, overrides: Partial<React.ComponentProps<typeof AppContent>> = {}) {
  return {
    view, home: <HealthyScreen label="home content" />, settings: <HealthyScreen label="settings content" />,
    azkarList: <HealthyScreen label="azkar content" />, favorites: <HealthyScreen label="favorites content" />,
    category: <HealthyScreen label="category content" />, mushafList: <HealthyScreen label="mushaf list content" />,
    mushafReader: null, mushafReaderActive: false, prayer: <HealthyScreen label="prayer content" />,
    tasbih: <HealthyScreen label="tasbih content" />, onHome: vi.fn(), ...overrides,
  }
}

describe('ScreenErrorBoundary', () => {
  it('catches a broken screen and isolates failure from the surrounding shell', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const onHome = vi.fn()
      render(<div><div data-testid="bottom-nav">bottom nav</div><ScreenErrorBoundary resetKey="home" onHome={onHome}><ThrowingScreen /></ScreenErrorBoundary></div>)
      expect(screen.getByRole('alert')).toHaveTextContent('حدث خطأ في هذه الشاشة')
      expect(screen.getByTestId('bottom-nav')).toHaveTextContent('bottom nav')
    } finally { errorSpy.mockRestore() }
  })

  it('isolates a broken active screen from other AppContent boundaries', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<AppContent {...contentProps({ name: 'home' }, { home: <ThrowingScreen /> })} />)
      expect(screen.getByRole('alert')).toHaveTextContent('حدث خطأ في هذه الشاشة')
      const healthy = contentProps({ name: 'settings' }, { settings: <HealthyScreen label="healthy settings" /> })
      render(<AppContent {...healthy} />)
      expect(screen.getByText('healthy settings')).toBeTruthy()
    } finally { errorSpy.mockRestore() }
  })

  it('isolates a broken category screen within its own ScreenErrorBoundary', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const props = contentProps({ name: 'category', id: 'morning' }, { category: <ThrowingScreen /> })
      const { rerender } = render(<AppContent {...props} />)
      expect(screen.getByRole('alert')).toHaveTextContent('حدث خطأ في هذه الشاشة')
      rerender(<AppContent {...props} view={{ name: 'settings' }} />)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByText('settings content')).toBeTruthy()
    } finally { errorSpy.mockRestore() }
  })

  it('retries the same screen after the child is fixed', () => {
    function Harness(): ReactNode {
      const [broken, setBroken] = useState(true)
      return <>
        <button type="button" onClick={() => setBroken(false)} aria-label="fix-screen">fix</button>
        <ScreenErrorBoundary resetKey="home" onHome={vi.fn()}>
          {broken ? <ThrowingScreen /> : <HealthyScreen label="recovered" />}
        </ScreenErrorBoundary>
      </>
    }
    render(<Harness />)
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('fix-screen'))
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(screen.getByText('recovered')).toBeTruthy()
  })

  it('calls the home action from the fallback', () => {
    const onHome = vi.fn()
    render(<ScreenErrorBoundary resetKey="settings" onHome={onHome}><ThrowingScreen /></ScreenErrorBoundary>)
    fireEvent.click(screen.getByRole('button', { name: 'الرئيسية' }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('resets on resetKey change without remounting a stable mushaf reader child', () => {
    const mounts = vi.fn()
    function StableReader(): ReactNode {
      useEffect(() => { mounts() }, [])
      return <div>reader</div>
    }
    const { rerender } = render(<ScreenErrorBoundary resetKey="mushaf-surah" onHome={vi.fn()}><StableReader /></ScreenErrorBoundary>)
    expect(mounts).toHaveBeenCalledTimes(1)
    rerender(<ScreenErrorBoundary resetKey="prayer-times" onHome={vi.fn()}><StableReader /></ScreenErrorBoundary>)
    expect(screen.getByText('reader')).toBeTruthy()
    expect(mounts).toHaveBeenCalledTimes(1)
  })
  it('rerenders from broken home to healthy settings inside the same AppContent', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const props = contentProps({ name: 'home' }, { home: <ThrowingScreen /> })
      const { rerender } = render(<AppContent {...props} />)
      expect(screen.getByRole('alert')).toBeTruthy()
      rerender(<AppContent {...props} view={{ name: 'settings' }} />)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByText('settings content')).toBeTruthy()
    } finally { errorSpy.mockRestore() }
  })

  it('keeps the real AppContent mushaf reader mounted across hidden-screen navigation', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const mounts = vi.fn(); const unmounts = vi.fn()
      function Reader(): ReactNode {
        useEffect(() => { mounts(); return () => unmounts() }, [])
        return <div>stable reader</div>
      }
      const reader = <Reader />
      const { rerender } = render(<AppContent {...contentProps({ name: 'mushaf-surah', number: 2 }, { mushafReader: reader, mushafReaderActive: true })} />)
      expect(mounts).toHaveBeenCalledTimes(1)
      rerender(<AppContent {...contentProps({ name: 'settings' }, { mushafReader: reader, mushafReaderActive: false })} />)
      rerender(<AppContent {...contentProps({ name: 'favorites' }, { mushafReader: reader, mushafReaderActive: false })} />)
      rerender(<AppContent {...contentProps({ name: 'mushaf-surah', number: 2 }, { mushafReader: reader, mushafReaderActive: true })} />)
      expect(mounts).toHaveBeenCalledTimes(1)
      expect(unmounts).toHaveBeenCalledTimes(0)
    } finally { errorSpy.mockRestore() }
  })

  it('hides the home action and shows the bottom navigation escape when home crashes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<AppContent {...contentProps({ name: 'home' }, { home: <ThrowingScreen /> })} />)
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'الرئيسية' })).toBeNull()
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy()
      expect(screen.getByText('يمكنك استخدام شريط التنقل بالأسفل.')).toBeTruthy()
    } finally { errorSpy.mockRestore() }
  })

  it('keeps the home action for a crashed settings screen inside AppContent', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const onHome = vi.fn()
      render(<AppContent {...contentProps({ name: 'settings' }, { settings: <ThrowingScreen />, onHome })} />)
      fireEvent.click(screen.getByRole('button', { name: 'الرئيسية' }))
      expect(onHome).toHaveBeenCalledTimes(1)
    } finally { errorSpy.mockRestore() }
  })

})
