import { describe, expect, test, vi } from 'vitest'
import { createApiClient } from './createApiClient'

const options = {
  baseUrl: 'https://example.test/v3',
  idInstance: '123',
  apiTokenInstance: 'test-token',
}

describe('getStateInstance', () => {
  test.each([
    'authorized',
    'notAuthorized',
    'starting',
    'blocked',
    'suspended',
    'pendingPassword',
  ])('возвращает состояние %s', async (stateInstance) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ stateInstance }))
    const client = createApiClient({ ...options, fetcher })
    await expect(client.getStateInstance()).resolves.toEqual({ stateInstance })
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      'https://example.test/v3/waInstance123/getStateInstance/test-token',
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(fetcher.mock.calls[0]?.[1]?.body).toBeUndefined()
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
  })

  test.each([
    null,
    {},
    [],
    { stateInstance: 123 },
    { stateInstance: 'unknown' },
  ])('отклоняет некорректный ответ %j', async (data) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data))
    await expect(
      createApiClient({ ...options, fetcher }).getStateInstance(),
    ).rejects.toMatchObject({ code: 'invalid-response' })
  })

  test('передаёт HTTP-ошибку', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }))
    await expect(
      createApiClient({ ...options, fetcher }).getStateInstance(),
    ).rejects.toMatchObject({ code: 'http', status: 401 })
  })

  test('принимает сигнал отмены', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(
      createApiClient({ ...options, fetcher }).getStateInstance({
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({ code: 'aborted' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('не выполняет запрос после закрытия клиента', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const client = createApiClient({ ...options, fetcher })
    client.dispose()
    await expect(client.getStateInstance()).rejects.toMatchObject({
      code: 'aborted',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
