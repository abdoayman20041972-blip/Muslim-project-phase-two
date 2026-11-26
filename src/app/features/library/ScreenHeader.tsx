import type { ReactNode } from 'react'
import { BackButton } from '../../components/app-chrome'

/** Header row used by every library screen: the shared back button first (right edge), then one title and an optional line under it. */
export function ScreenHeader({ title, subtitle, onBack, backLabel, children }: { title: string; subtitle?: string; onBack: () => void; backLabel?: string; children?: ReactNode }) {
  return (
    <header className="lib-header">
      <BackButton onClick={onBack} label={backLabel} />
      <div className="min-w-0 flex-1">
        <h1 className="lib-header-title">{title}</h1>
        {subtitle && <p className="lib-header-sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
