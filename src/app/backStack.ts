import { useEffect, useRef } from 'react'

// Overlays (dialogs, detail panels, share cards) register here while open so the
// Android hardware back button closes the topmost one before any screen navigation.
type Entry = { id: number; run: () => void }
let nextId = 1
const stack: Entry[] = []

/** Registers a handler on top of the stack. Returns the unregister function. */
export function pushBackHandler(run: () => void): () => void {
  const entry: Entry = { id: nextId++, run }
  stack.push(entry)
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

export function backHandlerCount(): number {
  return stack.length
}

/** While `active`, hardware back calls `onBack` (latest closure) instead of leaving the screen. */
export function useBackHandler(active: boolean, onBack: () => void) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    if (!active) return
    return pushBackHandler(() => ref.current())
  }, [active])
}
