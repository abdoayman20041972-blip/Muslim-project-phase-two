import { useContext, useEffect, useId, useRef, useState } from 'react'
import { ScreenActiveContext } from '../../backStack'
import { readPosition, resumeScene, savePosition, sceneId } from './readerPosition'

// Distance from the top of the window that counts as "the scene being read". It grows with the
// UI scale (root font size) so a taller header at the large scale does not hide the scene.
const headOffset = () => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return Math.max(140, Math.round(rem * 9))
}

function sceneElements(root: HTMLElement | null) {
  return root ? Array.from(root.querySelectorAll<HTMLElement>('[data-scene]')) : []
}

function jumpTo(root: HTMLElement | null, heading: string) {
  const el = sceneElements(root).find((n) => n.dataset.scene === sceneId(heading))
  if (!el) return false
  el.scrollIntoView?.({ block: 'start' })
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus?.({ preventScroll: true })
  return true
}

/**
 * Scene index and reading position for a story. Saves the scene at the top of the screen after the
 * user scrolls (never on open, so the saved place is not overwritten by the first scene), and offers
 * "continue from" when a saved scene still exists in the story.
 */
export function SceneNav({ storyId, headings, rootRef }: { storyId: string; headings: string[]; rootRef: React.RefObject<HTMLElement | null> }) {
  const [indexOpen, setIndexOpen] = useState(false)
  const [resume, setResume] = useState<string | null>(() => resumeScene(storyId, headings))
  const timer = useRef(0)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  // Kept-alive screens stay mounted but hidden (display:none), where every rect is zero: they must
  // neither listen to scroll nor save a position.
  const screenActive = useContext(ScreenActiveContext)

  useEffect(() => {
    setResume(resumeScene(storyId, headings))
  }, [storyId, headings])

  useEffect(() => {
    if (!screenActive) return
    const onScroll = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        const offset = headOffset()
        let current: string | null = null
        for (const el of sceneElements(rootRef.current)) {
          if (el.getBoundingClientRect().top <= offset) current = el.dataset.scene ?? null
          else break
        }
        if (current) savePosition(storyId, current)
      }, 350)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer.current)
      window.removeEventListener('scroll', onScroll)
    }
  }, [storyId, rootRef, screenActive])

  if (headings.length < 2) return null
  return (
    <nav className="ys-nav" aria-label="فهرس المشاهد">
      {resume ? (
        <button
          type="button"
          className="ys-nav-resume u-pressable"
          onClick={() => {
            jumpTo(rootRef.current, resume)
            setResume(null)
          }}
        >
          تابع من: {resume}
        </button>
      ) : null}
      {headings.length >= 5 ? (
        <>
          <button ref={toggleRef} type="button" className="ys-nav-toggle u-pressable" aria-expanded={indexOpen} aria-controls={listId} onClick={() => setIndexOpen((v) => !v)}>
            {indexOpen ? 'إخفاء فهرس المشاهد' : `فهرس المشاهد (${headings.length})`}
          </button>
          {indexOpen ? (
            <ol id={listId} className="ys-nav-list">
              {headings.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    className={'u-pressable' + (readPosition(storyId) === sceneId(h) ? ' is-saved' : '')}
                    onClick={() => {
                      jumpTo(rootRef.current, h)
                      setIndexOpen(false)
                      toggleRef.current?.focus({ preventScroll: true })
                    }}
                  >
                    {h}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </nav>
  )
}
