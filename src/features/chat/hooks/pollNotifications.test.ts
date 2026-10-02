import { afterEach, expect, test, vi } from 'vitest'
import { ApiError, createApiClient } from '../../../api'
import { pollNotifications } from './pollNotifications'

afterEach(() => {
  vi.useRealTimers()
})
const message = {
  chatId: 'chat',
  idMessage: 'msg-1',
  text: 'Привет',
  timestamp: 123,
  phoneNumber: '79991234567',
}
function setup() {
  vi.useFakeTimers()
  const client = createApiClient({
    baseUrl: 'https://example.test',
    idInstance: '123',
    apiTokenInstance: 'test-token',
  })
  const receive = vi
    .spyOn(client, 'receiveNotification')
    .mockResolvedValue(null)
  const remove = vi
    .spyOn(client, 'deleteNotification')
    .mockResolvedValue({ result: true })
  const controller = new AbortController()
  const onMessage = vi.fn()
  const onError = vi.fn()

  return { client, receive, remove, controller, onMessage, onError }
}

test('обрабатывает до удаления и не запускает следующий запрос до подтверждения', async () => {
  const s = setup()
  s.receive.mockResolvedValueOnce({ receiptId: 1, message })
  let acknowledge: ((value: { result: boolean }) => void) | undefined
  s.remove.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        acknowledge = resolve
      }),
  )
  const loop = pollNotifications(
    s.client,
    s.controller.signal,
    s.onMessage,
    s.onError,
  )
  await vi.advanceTimersByTimeAsync(0)
  expect(s.onMessage).toHaveBeenCalledWith(message)
  expect(s.remove).toHaveBeenCalledWith(1, { signal: s.controller.signal })
  await vi.advanceTimersByTimeAsync(5000)
  expect(s.receive).toHaveBeenCalledTimes(1)
  acknowledge?.({ result: true })
  await vi.advanceTimersByTimeAsync(1000)
  expect(s.receive).toHaveBeenCalledTimes(2)
  s.controller.abort()
  await loop
  expect(vi.getTimerCount()).toBe(0)
})

test('повторяет после ошибки удаления и подтверждает неподдерживаемое событие', async () => {
  const s = setup()
  s.receive
    .mockResolvedValueOnce({ receiptId: 1, message })
    .mockResolvedValueOnce({ receiptId: 1, message })
    .mockResolvedValueOnce({ receiptId: 2, message: null })
  s.remove.mockRejectedValueOnce(new ApiError('network', 'Ошибка'))
  const loop = pollNotifications(
    s.client,
    s.controller.signal,
    s.onMessage,
    s.onError,
  )
  await vi.advanceTimersByTimeAsync(0)
  expect(s.onError).toHaveBeenLastCalledWith(expect.any(String))
  await vi.advanceTimersByTimeAsync(1999)
  expect(s.receive).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1001)
  expect(s.receive).toHaveBeenCalledTimes(3)
  expect(s.onMessage).toHaveBeenCalledTimes(2)
  expect(s.remove).toHaveBeenLastCalledWith(2, { signal: s.controller.signal })
  s.controller.abort()
  await loop
})

test.each([
  new ApiError('http', 'Ошибка', 401),
  new ApiError('http', 'Ошибка', 400),
  new ApiError('invalid-response', 'Ошибка'),
])('останавливается при постоянной ошибке %#', async (error) => {
  const s = setup()
  s.receive.mockRejectedValueOnce(error)
  await pollNotifications(s.client, s.controller.signal, s.onMessage, s.onError)
  expect(s.receive).toHaveBeenCalledTimes(1)
  expect(s.remove).not.toHaveBeenCalled()
  expect(s.onError).toHaveBeenLastCalledWith(
    expect.stringContaining('остановлено'),
  )
})

test('игнорирует поздний ответ после отмены', async () => {
  const s = setup()
  let resolveNotification:
    | ((value: { receiptId: number; message: typeof message }) => void)
    | undefined
  s.receive.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveNotification = resolve
      }),
  )
  const loop = pollNotifications(
    s.client,
    s.controller.signal,
    s.onMessage,
    s.onError,
  )
  s.controller.abort()
  resolveNotification?.({ receiptId: 1, message })
  await loop
  expect(s.onMessage).not.toHaveBeenCalled()
  expect(s.remove).not.toHaveBeenCalled()
})

test('увеличивает паузу до 30 секунд и прекращает повторы при отмене', async () => {
  const s = setup()
  s.receive.mockRejectedValue(new ApiError('network', 'Ошибка'))
  const loop = pollNotifications(
    s.client,
    s.controller.signal,
    s.onMessage,
    s.onError,
  )
  await vi.advanceTimersByTimeAsync(0)
  let calls = 1

  for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
    await vi.advanceTimersByTimeAsync(delay - 1)
    expect(s.receive).toHaveBeenCalledTimes(calls)
    await vi.advanceTimersByTimeAsync(1)
    expect(s.receive).toHaveBeenCalledTimes(++calls)
  }

  s.controller.abort()
  await loop
  expect(vi.getTimerCount()).toBe(0)
})

test('не удаляет уведомление, если обработчик отменил сессию', async () => {
  const s = setup()
  s.receive.mockResolvedValueOnce({ receiptId: 1, message })
  s.onMessage.mockImplementation(() => s.controller.abort())
  await pollNotifications(s.client, s.controller.signal, s.onMessage, s.onError)
  expect(s.remove).not.toHaveBeenCalled()
})
