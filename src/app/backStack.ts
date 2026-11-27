import { createContext, useContext, useEffect, useRef } from 'react'

// Overlays (dialogs, detail panels, share cards) register here while open so the
// Android hardware back button closes the topmost one before any screen navigation.
type Entry = { id: number; run: () => void }
let nextId = 1
const stack: Entry[] = []

/** Registers a handler on top of the stack. Returns the unregister function. */
export function pushBackHandler(run: () => void, onId?: (id: number) => void): () => void {
  const entry: Entry = { id: nextId++, run }
  stack.push(entry)
  onId?.(entry.id)
  return () => {
    const i = stack.findIndex((e) => e.id === entry.id)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** Runs the topmost handler. Returns true when an overlay consumed the back press. */
export function runTopBackHandler(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.run()
  return true
}

/** True when the entry with this id is the topmost overlay. */
export function isTopBackHandler(id: number | null): boolean {
  return id !== null && stack.length > 0 && stack[stack.length - 1].id === id
}

export function backHandlerCount(): number {
  return stack.length
}

/** False for a kept-alive screen that is mounted but hidden. Defaults to true outside screens. */
export const ScreenActiveContext = createContext(true)

/**
 * While `active` and the owning screen is the visible one, hardware back calls `onBack`
 * (latest closure) instead of leaving the screen. A hidden screen never holds a handler.
 */
export function useBackHandler(active: boolean, onBack: () => void): () => boolean {
  const ref = useRef(onBack)
  const idRef = useRef<number | null>(null)
  ref.current = onBack
  const screenActive = useContext(ScreenActiveContext)
  const on = active && screenActive
  useEffect(() => {
    if (!on) return
    const off = pushBackHandler(() => ref.current(), (id) => { idRef.current = id })
    return () => { off(); idRef.current = null }
  }, [on])
  /** For Escape handlers: true only when this overlay is the topmost one. */
  return () => isTopBackHandler(idRef.current)
}
