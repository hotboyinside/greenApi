import { ApiError } from '../api'
import type { ApiClient, ApiCallOptions, Notification } from '../api'

export function createMockApiClient() {
  const controller = new AbortController()
  let nextId = 1
  const notifications: Notification[] = []

  function enqueue(chatId: string, text: string, name?: string) {
    const id = nextId++
    notifications.push({
      receiptId: id,
      message: {
        chatId,
        idMessage: `mock-incoming-${id}`,
        text,
        timestamp: Math.floor(Date.now() / 1000),
        phoneNumber: chatId,
        name,
      },
    })
  }

  enqueue('79991234567', 'Привет! Это тестовое входящее сообщение.', 'Анна')
  enqueue('79997654321', 'Открой чат, чтобы сбросить непрочитанные.', 'Иван')

  function wait(ms: number, options: ApiCallOptions = {}): Promise<void> {
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal

    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        reject(new ApiError('aborted', 'Тестовый запрос отменён'))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort)
        resolve()
      }, ms)

      if (signal.aborted) abort()
      else signal.addEventListener('abort', abort, { once: true })
    })
  }

  const api: ApiClient = {
    async getStateInstance(options) {
      await wait(100, options)
      return { stateInstance: 'authorized' }
    },
    async checkAccount(phoneNumber, options) {
      await wait(300, options)
      return { exist: true, chatId: String(phoneNumber), fromCache: false }
    },
    async sendMessage({ chatId, message }, options) {
      await wait(300, options)
      const idMessage = `mock-outgoing-${nextId++}`
      enqueue(chatId, `Тестовый ответ: ${message}`)
      return { idMessage }
    },
    async receiveNotification(options) {
      await wait(800, options)
      return notifications[0] ?? null
    },
    async deleteNotification(receiptId, options) {
      await wait(50, options)
      const index = notifications.findIndex(
        (item) => item.receiptId === receiptId,
      )
      if (index !== -1) notifications.splice(index, 1)
      return { result: true }
    },
    dispose() {
      controller.abort()
      notifications.length = 0
    },
  }

  return { api, idInstance: `mock-${crypto.randomUUID()}` }
}
