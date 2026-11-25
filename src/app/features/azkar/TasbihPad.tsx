import { toArabicNumber } from '../../constants'

type Props = {
  current: number
  target: number
  variant: 'list' | 'journey'
  onTap: (event: { currentTarget: HTMLButtonElement }) => void
  onUndo?: () => void
}

const R = 44
const C = 50

function polar(angle: number) {
  const rad = (angle * Math.PI) / 180
  return [C + R * Math.cos(rad), C + R * Math.sin(rad)]
}

/** One bead of the ring: an arc from startDeg to endDeg (degrees, 0 = three o'clock). */
function arc(startDeg: number, endDeg: number) {
  const [x1, y1] = polar(startDeg)
  const [x2, y2] = polar(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/**
 * The tasbih tap pad: a round button whose ring is made of one bead per count (up to 40 counts,
 * a smooth ring above that). Each tap lights the next bead. The label says what a tap does.
 */
export function TasbihPad({ current, target, variant, onTap, onUndo }: Props) {
  const completed = current >= target
  const remaining = Math.max(0, target - current)
  const beads = target <= 40 && target > 1
  const step = 360 / Math.max(1, target)
  const gap = Math.min(8, step * 0.28)
  const full = Math.min(1, current / Math.max(1, target))
  const circumference = 2 * Math.PI * R

  const ring = (
    <svg viewBox="0 0 100 100" className="dpad-ring" aria-hidden="true" focusable="false">
      {beads ? (
        Array.from({ length: target }, (_, i) => {
          const start = -90 + i * step + gap / 2
          return <path key={i} d={arc(start, start + step - gap)} className={i < current ? 'dpad-bead dpad-bead-on' : 'dpad-bead'} />
        })
      ) : (
        <>
          <circle cx={C} cy={C} r={R} className="dpad-bead" />
          <circle
            cx={C}
            cy={C}
            r={R}
            className="dpad-bead dpad-bead-on"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - full)}
            transform={`rotate(-90 ${C} ${C})`}
          />
        </>
      )}
    </svg>
  )

  const pad = (
    <button
      type="button"
      data-sound="tasbih"
      onClick={onTap}
      disabled={completed && variant === 'list'}
      aria-label={completed ? 'تم إكمال الذكر' : 'تسجيل مرة من الذكر'}
      className={`dpad-pad u-pressable${completed ? ' dpad-done' : ''}`}
    >
      {ring}
      {completed ? <span className="dpad-check" aria-hidden="true">✓</span> : <span className="dpad-dot" aria-hidden="true" />}
    </button>
  )

  return (
    <div className={`dpad dpad-${variant}`}>
      {pad}
      <div
        className="dpad-count"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={current}
        aria-label={'تقدم الذكر: ' + current + ' من ' + target}
      >
        <span className="dpad-now">{toArabicNumber(current)}</span>
        <span className="dpad-of">من {toArabicNumber(target)}</span>
      </div>
      <div className="dpad-meta">
      <div className="dpad-left">
        {completed ? '✓ تم الإكمال' : <>المتبقي <strong>{toArabicNumber(remaining)}</strong></>}
      </div>
      {onUndo && current > 0 && (
        <button type="button" data-sound="none" onClick={onUndo} aria-label="تراجع عن آخر نقرة" className="dpad-undo u-pressable">
          ↩ تراجع
        </button>
      )}
      </div>
    </div>
  )
}
