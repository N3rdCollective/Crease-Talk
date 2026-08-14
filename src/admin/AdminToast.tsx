import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type ToastTone = 'info' | 'success' | 'error'

type ToastItem = {
  id: string
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {items.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'error'
                ? XCircle
                : Info
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 border px-3 py-3 text-sm shadow-lg ${
                toast.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : toast.tone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-950'
                    : 'border-neutral-200 bg-white text-neutral-900'
              }`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
              <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                className="shrink-0 opacity-60 hover:opacity-100"
                onClick={() =>
                  setItems((prev) => prev.filter((t) => t.id !== toast.id))
                }
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useAdminToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider')
  return ctx
}
