import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export type AlertOptions = {
  title?: string
  message: string
  okLabel?: string
}

type DialogRequest =
  | { type: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: 'alert'; options: AlertOptions; resolve: () => void }

type ConfirmDialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

const ConfirmDialogContext = createContext<ConfirmDialogApi | null>(null)

export function useConfirmDialog(): ConfirmDialogApi {
  const context = useContext(ConfirmDialogContext)
  if (!context) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  return context
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null)
  const requestRef = useRef<DialogRequest | null>(null)

  const close = useCallback((value?: boolean) => {
    const current = requestRef.current
    if (!current) return
    requestRef.current = null
    setRequest(null)
    if (current.type === 'confirm') current.resolve(value === true)
    else current.resolve()
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    if (requestRef.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      const next: DialogRequest = { type: 'confirm', options, resolve }
      requestRef.current = next
      setRequest(next)
    })
  }, [])

  const alert = useCallback((options: AlertOptions) => {
    if (requestRef.current) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const next: DialogRequest = { type: 'alert', options, resolve }
      requestRef.current = next
      setRequest(next)
    })
  }, [])

  useEffect(() => {
    if (!request) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [request, close])

  useEffect(() => {
    if (!request) return
    document.querySelector<HTMLButtonElement>('[data-confirm-dialog-autofocus]')?.focus()
  }, [request])

  if (!request) {
    return <ConfirmDialogContext.Provider value={{ confirm, alert }}>{children}</ConfirmDialogContext.Provider>
  }

  const isConfirm = request.type === 'confirm'
  const confirmOptions = isConfirm ? request.options : null
  const alertOptions = isConfirm ? null : request.options

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      <div
        role="presentation"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-azkar-bg/95 p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) close(false)
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={(confirmOptions?.title ?? alertOptions?.title) ? 'confirm-dialog-title' : undefined}
          className="w-full max-w-sm rounded-3xl border border-azkar-gold-soft bg-azkar-card p-8 text-center shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {(confirmOptions?.title ?? alertOptions?.title) && (
            <h2 id="confirm-dialog-title" className="font-amiri text-xl font-bold text-azkar-teal-ink">
              {confirmOptions?.title ?? alertOptions?.title}
            </h2>
          )}
          <p className="text-sm leading-6 text-azkar-ink-soft">{confirmOptions?.message ?? alertOptions?.message}</p>
          <div className="mt-6 flex justify-center gap-2">
            {isConfirm ? (
              <>
                <button
                  type="button"
                  data-confirm-dialog-autofocus
                  onClick={() => close(false)}
                  className="u-pressable rounded-xl border border-azkar-hairline bg-azkar-card px-4 py-2 text-sm font-bold text-azkar-teal-ink"
                >
                  {confirmOptions?.cancelLabel ?? 'إلغاء'}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={
                    confirmOptions?.danger
                      ? 'u-pressable rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600'
                      : 'u-pressable rounded-xl bg-azkar-teal px-4 py-2 text-sm font-bold text-azkar-card'
                  }
                >
                  {confirmOptions?.confirmLabel ?? 'تأكيد'}
                </button>
              </>
            ) : (
              <button
                type="button"
                data-confirm-dialog-autofocus
                onClick={() => close()}
                className="u-pressable rounded-xl bg-azkar-teal px-4 py-2 text-sm font-bold text-azkar-card"
              >
                {alertOptions?.okLabel ?? 'حسنًا'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ConfirmDialogContext.Provider>
  )
}
