import { afterEach, expect, it, vi } from 'vitest'
import { createMockApiClient } from './createMockApiClient'

afterEach(() => vi.useRealTimers())

it('подтверждает уведомления и возвращает ответ после отправки', async () => {
  vi.useFakeTimers()
  const { api } = createMockApiClient()

  for (let index = 0; index < 2; index++) {
    const request = api.receiveNotification()
    await vi.advanceTimersByTimeAsync(800)
    const notification = await request
    expect(notification?.message?.text).toBeTruthy()
    const deletion = api.deleteNotification(notification!.receiptId)
    await vi.advanceTimersByTimeAsync(50)
    await deletion
  }

  const send = api.sendMessage({ chatId: '79990000000', message: 'Привет' })
  await vi.advanceTimersByTimeAsync(300)
  expect((await send).idMessage).toMatch(/^mock-outgoing-/)
  const request = api.receiveNotification()
  await vi.advanceTimersByTimeAsync(800)
  expect((await request)?.message).toMatchObject({
    chatId: '79990000000',
    text: 'Тестовый ответ: Привет',
  })
  api.dispose()
})

it('отменяет ожидание при завершении сессии', async () => {
  vi.useFakeTimers()
  const { api } = createMockApiClient()
  const result = expect(api.receiveNotification()).rejects.toMatchObject({
    code: 'aborted',
  })
  api.dispose()
  await result
  expect(vi.getTimerCount()).toBe(0)
})
