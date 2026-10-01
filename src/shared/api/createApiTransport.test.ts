import { afterEach, describe, expect, test, vi } from 'vitest'
import { createApiTransport as createApiClient } from './createApiTransport'

const options = {
  baseUrl: 'https://example.test/v3/',
  idInstance: '123',
  apiTokenInstance: 'secret-token',
}

function parseMessage(data: unknown): string {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('idMessage' in data) ||
    typeof data.idMessage !== 'string'
  ) {
    throw new Error('Invalid message')
  }
  return data.idMessage
}

const request = {
  method: 'POST' as const,
  endpoint: 'sendMessage',
  parse: parseMessage,
  body: { chatId: '456', message: 'Привет' },
}

afterEach(() => vi.useRealTimers())

describe('createApiClient', () => {
  test('builds the URL, serializes the body and parses the response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ idMessage: '789' }))
    const client = createApiClient({ ...options, fetcher })
    await expect(client.request(request)).resolves.toBe('789')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.test/v3/waInstance123/sendMessage/secret-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request.body),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  test('supports notification receipt IDs and query parameters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(null))
    const client = createApiClient({ ...options, fetcher })
    await client.request({
      method: 'DELETE',
      endpoint: 'deleteNotification/42',
      query: { sample: 30 },
      parse: (data) => data,
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.test/v3/waInstance123/deleteNotification/secret-token/42?sample=30',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  test.each([401, 429, 500])(
    'reports HTTP %s without retrying or exposing the body',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('secret-token', { status }))
      await expect(
        createApiClient({ ...options, fetcher }).request(request),
      ).rejects.toMatchObject({
        code: 'http',
        status,
        message: `Ошибка HTTP ${status}`,
      })
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )

  test.each([
    { response: () => new Response('invalid'), code: 'invalid-response' },
    {
      response: () => Response.json({ idMessage: 123 }),
      code: 'invalid-response',
    },
    {
      response: () => Response.json({ status: false, reason: 'secret-token' }),
      code: 'api',
    },
  ])('reports $code', async ({ response, code }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response())
    await expect(
      createApiClient({ ...options, fetcher }).request(request),
    ).rejects.toMatchObject({ code })
  })

  test('sanitizes network errors', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('secret-token'))
    await expect(
      createApiClient({ ...options, fetcher }).request(request),
    ).rejects.toMatchObject({
      code: 'network',
      message: 'Не удалось связаться с GREEN-API',
    })
  })

  test.each([
    'bad-url',
    'http://example.test',
    'https://example.test?token=secret',
  ])('rejects invalid base URL %s', (baseUrl) => {
    expect(() => createApiClient({ ...options, baseUrl })).toThrow()
  })

  test('does not start pre-cancelled requests', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const signal = AbortSignal.abort()
    await expect(
      createApiClient({ ...options, fetcher }).request({ ...request, signal }),
    ).rejects.toMatchObject({ code: 'aborted' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  function pendingFetcher() {
    return vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
  }

  test('times out and clears the timer', async () => {
    vi.useFakeTimers()
    const client = createApiClient({
      ...options,
      fetcher: pendingFetcher(),
      timeoutMs: 100,
    })
    const assertion = expect(client.request(request)).rejects.toMatchObject({
      code: 'timeout',
    })
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })

  test('supports caller cancellation', async () => {
    const controller = new AbortController()
    const client = createApiClient({ ...options, fetcher: pendingFetcher() })
    const assertion = expect(
      client.request({ ...request, signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'aborted' })
    controller.abort()
    await assertion
  })

  test('disposal cancels active requests and prevents future requests', async () => {
    const fetcher = pendingFetcher()
    const client = createApiClient({ ...options, fetcher })
    const assertions = [
      expect(client.request(request)).rejects.toMatchObject({
        code: 'aborted',
      }),
      expect(client.request(request)).rejects.toMatchObject({
        code: 'aborted',
      }),
    ]
    client.dispose()
    await Promise.all(assertions)
    await expect(client.request(request)).rejects.toMatchObject({
      code: 'aborted',
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
