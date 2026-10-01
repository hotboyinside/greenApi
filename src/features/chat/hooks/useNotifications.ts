import { useEffect, useState } from 'react'
import type { ApiClient, IncomingTextMessage } from '../../../shared/api'
import { pollNotifications } from './pollNotifications'

export function useNotifications(
  client: ApiClient,
  onMessage: (message: IncomingTextMessage) => void,
) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    // StrictMode может отменить первый эффект до начала запроса.
    queueMicrotask(() => {
      if (!controller.signal.aborted)
        void pollNotifications(client, controller.signal, onMessage, setError)
    })

    return () => {
      controller.abort()
    }
  }, [client, onMessage])
  return error
}
