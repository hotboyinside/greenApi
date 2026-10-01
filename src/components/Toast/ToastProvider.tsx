import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toast } from './Toast'
import { ToastContext } from './ToastContext'
import type { ToastMessage } from './types'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const nextId = useRef(0)

  const showError = useCallback((text: string) => {
    setMessage({ id: ++nextId.current, text, closing: false })
  }, [])

  const closeToast = useCallback(() => {
    setMessage((current) =>
      current && !current.closing ? { ...current, closing: true } : current,
    )
  }, [])

  const finishClose = useCallback((id: number) => {
    setMessage((current) =>
      current?.id === id && current.closing ? null : current,
    )
  }, [])

  const actions = useMemo(
    () => ({ showError, closeToast }),
    [showError, closeToast],
  )

  useEffect(() => {
    if (!message) return
    const { id, closing } = message
    const timer = setTimeout(
      () => {
        if (closing) finishClose(id)
        else
          setMessage((current) =>
            current?.id === id ? { ...current, closing: true } : current,
          )
      },
      closing ? 250 : 5000,
    )
    return () => {
      clearTimeout(timer)
    }
  }, [message, finishClose])

  return (
    <ToastContext value={actions}>
      {children}
      <Toast message={message} onClose={closeToast} onExited={finishClose} />
    </ToastContext>
  )
}
