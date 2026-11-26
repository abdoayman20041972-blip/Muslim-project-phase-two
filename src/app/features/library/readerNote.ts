/** Book-file notes are shown to readers only when they are plain Arabic prose; raw English build diagnostics are never shown. */
export function readerNote(note?: string): string | undefined {
  const text = note?.trim()
  return text && !/[A-Za-z]/.test(text) ? text : undefined
}
