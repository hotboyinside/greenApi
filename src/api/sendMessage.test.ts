import { expect, test, vi } from 'vitest'
import { createApiClient } from './createApiClient'

const options = {
  baseUrl: 'https://example.test',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

test('отправляет текст без изменений и возвращает идентификатор сообщения', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ idMessage: 'msg-1' }))
  const input = { chatId: 'canonical-id', message: '  Привет\nMAX 😃  ' }
  await expect(
    createApiClient({ ...options, fetcher }).sendMessage(input),
  ).resolves.toEqual({ idMessage: 'msg-1' })
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    'https://example.test/waInstance123/sendMessage/test-token',
    expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
  )
})

test.each([
  null,
  {},
  { idMessage: 123 },
  { idMessage: '' },
  { idMessage: '  ' },
])('отклоняет ответ %j', async (data) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))
  await expect(
    createApiClient({ ...options, fetcher }).sendMessage({
      chatId: 'chat',
      message: 'Привет',
    }),
  ).rejects.toMatchObject({ code: 'invalid-response' })
})

test('не повторяет отправку при сетевой ошибке', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error('secret-token'))
  await expect(
    createApiClient({ ...options, fetcher }).sendMessage({
      chatId: 'chat',
      message: 'Привет',
    }),
  ).rejects.toMatchObject({ code: 'network' })
  expect(fetcher).toHaveBeenCalledTimes(1)
})
