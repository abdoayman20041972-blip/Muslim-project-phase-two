// Sub-screens inside More (such as the radio) register a back handler here so the
// Android back button steps out of them before leaving More.
let handler: (() => boolean) | null = null
export function setMoreBackHandler(next: (() => boolean) | null) { handler = next }
export function consumeMoreBack(): boolean {
  if (subHandler && subHandler()) return true
  return handler ? handler() : false
}

// A screen inside a sub-screen (for example an open chapter) can register a step-back that runs first.
let subHandler: (() => boolean) | null = null
export function setMoreSubBackHandler(next: (() => boolean) | null) { subHandler = next }
