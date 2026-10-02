import { expect, test, vi } from 'vitest'

import { createApiClient } from './createApiClient'

const options = {
  baseUrl: 'https://example.test/v3',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

const body = {
  typeWebhook: 'incomingMessageReceived',
  idMessage: 'msg-1',
  timestamp: 1763115112,
  senderData: {
    chatId: '10000000',
    chatName: 'Павел',
    senderPhoneNumber: 79991234567,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет\nMAX 😃' },
  },
}

test('получает и удаляет уведомление по контракту API', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ receiptId: 123, body }))
    .mockResolvedValueOnce(Response.json({ result: true, reason: '' }))
  const client = createApiClient({ ...options, fetcher })
  await expect(client.receiveNotification()).resolves.toEqual({
    receiptId: 123,
    message: {
      chatId: '10000000',
      name: 'Павел',
      phoneNumber: '79991234567',
      idMessage: 'msg-1',
      timestamp: 1763115112,
      text: 'Привет\nMAX 😃',
    },
  })
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    'https://example.test/v3/waInstance123/receiveNotification/test-token?receiveTimeout=20',
  )
  await expect(client.deleteNotification(123)).resolves.toEqual({
    result: true,
  })
  expect(fetcher.mock.calls[1]?.[0]).toBe(
    'https://example.test/v3/waInstance123/deleteNotification/test-token/123',
  )
  expect(fetcher.mock.calls[1]?.[1]?.method).toBe('DELETE')
})

test.each(['', '  ', 'null'])('принимает пустую очередь %j', async (text) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(text))
  await expect(
    createApiClient({ ...options, fetcher }).receiveNotification(),
  ).resolves.toBeNull()
})

test.each([
  {},
  [],
  { receiptId: '1', body },
  { receiptId: 1.5, body },
  { receiptId: 0, body },
  { receiptId: 1, body: {} },
  { receiptId: 1, body: { ...body, idMessage: '' } },
  { receiptId: 1, body: { ...body, senderData: {} } },
  { receiptId: 1, body: { ...body, timestamp: '123' } },
  {
    receiptId: 1,
    body: {
      ...body,
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 123 },
      },
    },
  },
])('отклоняет повреждённые данные %#', async (data) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))
  await expect(
    createApiClient({ ...options, fetcher }).receiveNotification(),
  ).rejects.toMatchObject({ code: 'invalid-response' })
})

test.each([{}, null, { result: 'true' }])(
  'проверяет результат удаления %#',
  async (data) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))
    await expect(
      createApiClient({ ...options, fetcher }).deleteNotification(1),
    ).rejects.toMatchObject({ code: 'invalid-response' })
  },
)

test('принимает result:false без передачи причины сервера', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ result: false, reason: 'secret-token' }))
  await expect(
    createApiClient({ ...options, fetcher }).deleteNotification(1),
  ).resolves.toEqual({ result: false })
})

test('таймаут получения превышает время long polling', async () => {
  vi.useFakeTimers()
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            ),
          ),
      )
    const client = createApiClient({ ...options, fetcher, timeoutMs: 10 })
    const result = client.receiveNotification()
    const assertion = expect(result).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
  } finally {
    vi.useRealTimers()
  }
})
