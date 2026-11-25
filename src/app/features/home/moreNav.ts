// Sub-screens inside More (such as the radio) register a back handler here so the
// Android back button steps out of them before leaving More.
let handler: (() => boolean) | null = null
export function setMoreBackHandler(next: (() => boolean) | null) { handler = next }
export function consumeMoreBack(): boolean { return handler ? handler() : false }
