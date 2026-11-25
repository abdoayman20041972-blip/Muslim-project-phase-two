// Quran recitation and live radio share one native notification/session, so only
// one of them may play at a time. These tiny hooks let each side stop the other
// without importing each other's providers.
let radioActive = false
const quranStartedListeners = new Set<() => void>()

export const isRadioActive = () => radioActive
export const setRadioActive = (value: boolean) => { radioActive = value }
export function onQuranStarted(listener: () => void) {
  quranStartedListeners.add(listener)
  return () => { quranStartedListeners.delete(listener) }
}
export function notifyQuranStarted() {
  quranStartedListeners.forEach((listener) => listener())
}
