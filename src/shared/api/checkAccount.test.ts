import { describe, expect, test, vi } from 'vitest'
import { createApiClient } from './createApiClient'

const options = {
  baseUrl: 'https://example.test/v3',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

describe('checkAccount', () => {
  test.each([79991234567, 375291234567])(
    'передаёт номер %s как число и возвращает chatId',
    async (phoneNumber) => {
      const response = { exist: true, chatId: '10000000', fromCache: true }
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(response))
      await expect(
        createApiClient({ ...options, fetcher }).checkAccount(phoneNumber),
      ).resolves.toEqual(response)
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        'https://example.test/v3/waInstance123/checkAccount/test-token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phoneNumber }),
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    },
  )

  test('возвращает отсутствие аккаунта без ошибки', async () => {
    const response = { exist: false, chatId: '', fromCache: false }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(response))
    await expect(
      createApiClient({ ...options, fetcher }).checkAccount(79991234567),
    ).resolves.toEqual(response)
  })

  test('принимает результат без кэша и допускает дополнительные поля', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        exist: true,
        chatId: '10000000',
        fromCache: false,
        extra: 'value',
      }),
    )
    await expect(
      createApiClient({ ...options, fetcher }).checkAccount(79991234567),
    ).resolves.toEqual({ exist: true, chatId: '10000000', fromCache: false })
  })

  test.each([
    null,
    {},
    [],
    { exist: 'true', chatId: '10000000', fromCache: true },
    { exist: true, chatId: 10000000, fromCache: true },
    { exist: true, chatId: '10000000' },
    { exist: true, chatId: '10000000', fromCache: 'true' },
    { exist: true, chatId: '', fromCache: true },
    { exist: true, chatId: '  ', fromCache: true },
    { exist: false, chatId: '10000000', fromCache: false },
  ])('отклоняет некорректный ответ %j', async (data) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))
    await expect(
      createApiClient({ ...options, fetcher }).checkAccount(79991234567),
    ).rejects.toMatchObject({ code: 'invalid-response' })
  })

  test('обрабатывает status false как ошибку API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status: false,
        reason: 'instance is starting or not authorized',
      }),
    )
    await expect(
      createApiClient({ ...options, fetcher }).checkAccount(79991234567),
    ).rejects.toMatchObject({ code: 'api' })
  })

  test.each([401, 469, 500])(
    'передаёт HTTP %s без повторных запросов',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status }))
      await expect(
        createApiClient({ ...options, fetcher }).checkAccount(79991234567),
      ).rejects.toMatchObject({ code: 'http', status })
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )

  test('принимает сигнал отмены', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(
      createApiClient({ ...options, fetcher }).checkAccount(79991234567, {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({ code: 'aborted' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('отменяет активную проверку при закрытии сессии', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
    const client = createApiClient({ ...options, fetcher })
    const assertion = expect(
      client.checkAccount(79991234567),
    ).rejects.toMatchObject({ code: 'aborted' })
    client.dispose()
    await assertion
    await expect(client.checkAccount(79991234567)).rejects.toMatchObject({
      code: 'aborted',
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
