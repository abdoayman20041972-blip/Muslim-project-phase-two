/**
 * fetch with a hard timeout, so a dead or very slow connection fails fast and the
 * UI can show its retry state instead of waiting forever. The timeout covers the
 * wait for the response headers; the caller's own AbortSignal still works.
 * (AbortSignal.timeout is avoided because older Android WebViews lack it.)
 */
export async function fetchWithTimeout(input: RequestInfo | URL, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const outer = init.signal
  const relay = () => controller.abort()
  if (outer?.aborted) controller.abort()
  outer?.addEventListener('abort', relay, { once: true })
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
    outer?.removeEventListener('abort', relay)
  }
}
