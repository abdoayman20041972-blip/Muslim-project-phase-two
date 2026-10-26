import { useEffect, useRef, useState } from "react";
import type { ZikrCategory } from "../../azkar-data";

export function CategoryIcon({ icon }: { icon: ZikrCategory["icon"] }) {
  const common = "w-5 h-5";
  switch (icon) {
    case "sun":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="11.2" y="1" width="1.6" height="3.5" rx=".8" fill="currentColor" transform={`rotate(${a} 12 12)`} />
          ))}
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "prayer":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 3 4.5 7.5V10h15V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6 11h12v7.5a1 1 0 0 1-1 1h-3v-5.5H10V19.5H7a1 1 0 0 1-1-1V11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "bed":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M3 18v-6a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v1h4a3 3 0 0 1 3 3v2M3 18v2M21 18v2M3 15h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
          <path d="M12 2c.6 3.6 1.9 4.9 5.5 5.5C13.9 8.1 12.6 9.4 12 13c-.6-3.6-1.9-4.9-5.5-5.5C10.1 6.9 11.4 5.6 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
  }
}
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="u-pressable w-10 h-10 rounded-full bg-azkar-card flex items-center justify-center text-azkar-ink-soft shrink-0 u-shadow-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal" aria-label="رجوع">
      <svg viewBox="0 0 24 24" className="w-4 h-4 rtl:rotate-180" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
const SPLASH_MOSQUE_IMAGE_URL = "/img/muslim-splash-mosque.jpg";

export function Splash({ exiting = false, onImageSettled }: { exiting?: boolean; onImageSettled?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const settledRef = useRef(false);
  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onImageSettled?.();
  };

  // The image may already be complete (cache) before React attached onLoad.
  useEffect(() => {
    if (imageRef.current?.complete) settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`muslim-splash fixed inset-0 z-[100] overflow-hidden ${exiting ? "muslim-splash-exit" : ""}`} role="status" aria-label="جاري تحميل مسلم">
      <div className="muslim-splash-ambient" aria-hidden="true">
        <span className="muslim-splash-star star-one" />
        <span className="muslim-splash-star star-two" />
        <span className="muslim-splash-star star-three" />
        <span className="muslim-splash-orb orb-one" />
        <span className="muslim-splash-orb orb-two" />
      </div>
      <div className="muslim-splash-arch" aria-hidden="true">
        <div className="muslim-splash-arch-glow" />
        <div className="muslim-splash-arch-line" />
        <div className="muslim-splash-lantern lantern-left" />
        <div className="muslim-splash-lantern lantern-right" />
      </div>
      <div className="muslim-splash-center">
        <div className="muslim-splash-emblem" aria-hidden="true">
          <span className="muslim-splash-ring ring-one" />
          <span className="muslim-splash-ring ring-two" />
          <span className="muslim-splash-ring ring-three" />
          <div className={`muslim-splash-emblem-core ${imageFailed ? "is-image-failed" : ""}`}>
            <img
              ref={imageRef}
              className="muslim-splash-emblem-image"
              src={SPLASH_MOSQUE_IMAGE_URL}
              alt=""
              aria-hidden="true"
              width={120}
              height={120}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={settle}
              onError={() => {
                setImageFailed(true);
                settle();
              }}
            />
            <svg className="muslim-splash-emblem-fallback-svg" viewBox="0 0 120 120" fill="none">
              <defs>
                <linearGradient id="splash-mosque-gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f7e3a6" />
                  <stop offset="1" stopColor="#d3ac55" />
                </linearGradient>
              </defs>
              <g stroke="url(#splash-mosque-gold)" strokeLinecap="round" strokeLinejoin="round">
                {/* ground + base platform */}
                <path d="M14 96h92" strokeWidth="2.6" />
                <path d="M18 96v-4.5M102 96v-4.5" strokeWidth="1.6" opacity=".7" />
                <path d="M24 91.5h72" strokeWidth="1.4" opacity=".55" />
                {/* outer minarets: shafts, balconies, spires, finials */}
                <path d="M27 91.5V46M93 91.5V46" strokeWidth="2" />
                <path d="M23.5 46h7M89.5 46h7" strokeWidth="1.8" />
                <path d="M24.5 40.5h5M90.5 40.5h5" strokeWidth="1.6" />
                <path d="M25.5 40.5V33M94.5 40.5V33" strokeWidth="1.6" />
                <path d="M25.5 33l3.5-3 3.5 3M94.5 33l3.5-3 3.5 3" strokeWidth="1.6" />
                <path d="M29 30v-3.5M93 27v-3.5M92.5 23.5l1.5-1 1.5 1M27 26.5l2-1.2 2 1.2" strokeWidth="1.4" />
                <path d="M29 44h-2.5M29 44h2.5M93 44h-2.5M93 44h2.5" strokeWidth="1.3" opacity=".8" />
                {/* minaret windows */}
                <path d="M26 56c0-1.7 1.3-3 3-3s3 1.3 3 3v5h-6v-5ZM88 56c0-1.7 1.3-3 3-3s3 1.3 3 3v5h-6v-5Z" strokeWidth="1.3" opacity=".75" />
                {/* main dome */}
                <path d="M35 91.5V60c2.5-12.5 9-22.5 18-29.5 2.8-2.6 4.8-5 7-8.5 2.2 3.5 4.2 5.9 7 8.5 9 7 15.5 17 18 29.5v31.5" strokeWidth="2.3" />
                {/* dome inner ribs */}
                <path d="M46 91.5V64c1.8-10 6-18 11-24M74 91.5V64c-1.8-10-6-18-11-24" strokeWidth="1.2" opacity=".55" />
                {/* dome crescent finial */}
                <path d="M60 22v-6.5" strokeWidth="1.7" />
                <path d="M62.5 13.5a3.4 3.4 0 1 1-5-2.9 2.8 2.8 0 0 0 5 2.9Z" strokeWidth="1.5" />
                {/* dome band + windows */}
                <path d="M42 62.5h36" strokeWidth="1.3" opacity=".7" />
                <path d="M49 76c0-6 4.9-10.5 11-10.5S71 70 71 76v15.5H49V76Z" strokeWidth="2" />
                <path d="M53.5 91.5V79c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5v12.5" strokeWidth="1.4" opacity=".7" />
                {/* side doors */}
                <path d="M38.5 91.5V80c0-4.1 3.4-7.5 7.5-7.5M81.5 91.5V80c0-4.1-3.4-7.5-7.5-7.5" strokeWidth="1.5" opacity=".8" />
                {/* facade corner details */}
                <path d="M35 66h3.5M81.5 66H85" strokeWidth="1.3" opacity=".6" />
                <path d="M35 73h3.5M81.5 73H85M35 80h3.5M81.5 80H85" strokeWidth="1.2" opacity=".45" />
              </g>
              <path d="M87 17c7 3 10 10 7 16-3 6-9 9-16 7 4-1 8-4 9-8 2-5 2-10 0-15Z" fill="url(#splash-mosque-gold)" opacity=".9" />
              {/* reflective ground line */}
              <path d="M22 100h76" stroke="url(#splash-mosque-gold)" strokeWidth="1" opacity=".3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="muslim-splash-copy text-center">
          <div className="font-amiri muslim-splash-title">مسلم</div>
          <div className="muslim-splash-wordmark">Muslim</div>
          <div className="muslim-splash-divider"><span /></div>
        </div>
        <div className="muslim-splash-loader" role="progressbar" aria-label="تهيئة مسلم" aria-valuetext="جاري التهيئة">
          <div className="muslim-splash-loader-track"><span /></div>
          <div className="muslim-splash-loader-dot" />
        </div>
        <div className="muslim-splash-dua" aria-live="polite" aria-atomic="true">
          <span>اللهم اجعلنا من الذاكرين</span>
          <span>واشرح لي صدري</span>
          <span>ويسّر لي أمري</span>
        </div>
      </div>
      <div className="muslim-splash-footer" aria-hidden="true">
        <span>رفيقك اليومي للعبادة</span>
        <i />
        <span>أذكار · قرآن · صلاة</span>
      </div>
    </div>
  );
}

/** Shared on/off switch used across Settings and Prayer Times reminder toggles. Visual output is unchanged from the previous per-file copies. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} role="switch" aria-checked={checked} aria-label={label} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal ${checked ? "bg-azkar-teal" : "bg-azkar-bg-alt"}`}>
      <span aria-hidden="true" className={`absolute right-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[-1.25rem]" : "translate-x-[-0.125rem]"}`} />
    </button>
  );
}
