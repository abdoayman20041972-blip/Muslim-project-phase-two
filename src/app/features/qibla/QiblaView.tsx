import { ArrowLeft, MapPin } from 'lucide-react'
import { QiblaCompass } from './QiblaCompass'
import { useLocationCoords } from '../location/coords'

export function QiblaView({ onBack }: { onBack: () => void }) {
  const coords = useLocationCoords()

  return (
    <section dir="rtl" className="q2-page">
      <button type="button" onClick={onBack} aria-label="رجوع" className="q2-back u-pressable">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <header className="q2-title">
        <h1 className="font-amiri">القبلة</h1>
        <svg viewBox="0 0 64 64" className="q2-kaaba" aria-hidden="true">
          <path d="M13 24 32 15l19 9-19 9-19-9Z" fill="#111816" stroke="#d8b45c" strokeWidth="1.6" />
          <path d="M13 24v22l19 10V33L13 24Z" fill="#161d1b" stroke="#d8b45c" strokeWidth="1.4" />
          <path d="M51 24v22L32 56V33l19-9Z" fill="#0b100f" stroke="#b9974e" strokeWidth="1.4" />
          <path d="M13 28h38v5H13z" fill="#d8b45c" opacity=".9" />
          <path d="M30 41h5v11h-5z" fill="#d8b45c" />
        </svg>
      </header>

      {coords ? (
        <QiblaCompass coords={coords} />
      ) : (
        <div className="q2-empty">
          <MapPin className="h-6 w-6" />
          <span>حدد موقعك أولًا</span>
          <button type="button" onClick={onBack} aria-label="العودة" className="u-pressable">العودة</button>
        </div>
      )}
    </section>
  )
}
