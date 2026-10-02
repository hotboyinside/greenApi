import type { ApiClient, IncomingTextMessage } from '../../../api'
import { ApiError } from '../../../api'

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()

      return
    }

    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

export async function pollNotifications(
  client: ApiClient,
  signal: AbortSignal,
  onMessage: (message: IncomingTextMessage) => void,
  onError: (error: string | null) => void,
): Promise<void> {
  let failures = 0

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification({ signal })
      if (signal.aborted) return

      if (notification) {
        if (notification.message) onMessage(notification.message)

        if (signal.aborted) return

        await client.deleteNotification(notification.receiptId, { signal })
        // result:false также означает, что уведомление уже удалено другим потребителем.
      }

      if (signal.aborted) return

      failures = 0
      onError(null)

      await pause(1000, signal)
    } catch (cause) {
      if (
        signal.aborted ||
        (cause instanceof ApiError && cause.code === 'aborted')
      )
        return

      if (
        cause instanceof ApiError &&
        (cause.code === 'invalid-response' ||
          (cause.code === 'http' &&
            [400, 401, 403].includes(cause.status ?? 0)))
      ) {
        onError(
          'Получение сообщений остановлено. Проверьте настройки инстанса и подключитесь заново.',
        )

        return
      }

      onError('Не удалось получить сообщения. Повторяем подключение…')
      failures++

      await pause(Math.min(1000 * 2 ** Math.min(failures, 5), 30_000), signal)
    }
  }
}
