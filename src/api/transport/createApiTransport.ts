import { ApiError } from './ApiError'

export interface ApiClientOptions {
  baseUrl: string
  idInstance: string
  apiTokenInstance: string
  timeoutMs?: number
  fetcher?: typeof fetch
}

export interface ApiRequest<T> {
  allowEmptyResponse?: boolean
  method: 'GET' | 'POST' | 'DELETE'
  endpoint: string
  parse: (data: unknown) => T
  body?: unknown
  query?: Record<string, string | number>
  signal?: AbortSignal
  timeoutMs?: number
}

interface ApiTransport {
  request: <T>(options: ApiRequest<T>) => Promise<T>
  dispose: () => void
}

function isApiFailure(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    data.status === false
  )
}

export function createApiTransport(options: ApiClientOptions): ApiTransport {
  const {
    baseUrl: configuredUrl,
    idInstance,
    apiTokenInstance,
    timeoutMs: configuredTimeout,
    fetcher: configuredFetcher,
  } = options
  let baseUrl: URL
  try {
    baseUrl = new URL(configuredUrl)
  } catch {
    throw new ApiError('configuration', 'Некорректный адрес GREEN-API')
  }

  if (
    baseUrl.protocol !== 'https:' ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new ApiError(
      'configuration',
      'Укажите HTTPS-адрес API без параметров',
    )
  }

  if (!/^\d+$/.test(idInstance) || !apiTokenInstance.trim()) {
    throw new ApiError('configuration', 'Укажите idInstance и apiTokenInstance')
  }

  const apiBase = baseUrl.toString().replace(/\/$/, '')
  const token = apiTokenInstance.trim()
  const defaultTimeout = configuredTimeout ?? 15_000
  const fetcher = configuredFetcher ?? fetch
  const sessionController = new AbortController()

  async function request<T>(input: ApiRequest<T>): Promise<T> {
    const {
      method,
      endpoint,
      body: requestBody,
      query,
      signal,
      allowEmptyResponse,
      parse,
      timeoutMs: requestTimeout,
    } = input
    const timeoutMs = requestTimeout ?? defaultTimeout
    if (method === 'GET' && requestBody !== undefined) {
      throw new ApiError('configuration', 'GET-запрос не должен содержать тело')
    }

    if (sessionController.signal.aborted || signal?.aborted) {
      throw new ApiError('aborted', 'Запрос отменён')
    }

    const [methodName, receiptId] = endpoint.split('/')
    const receiptPath = receiptId === undefined ? '' : `/${receiptId}`
    const url = new URL(
      `${apiBase}/waInstance${idInstance}/${methodName}/${encodeURIComponent(token)}${receiptPath}`,
    )

    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value))
    }

    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort()
    sessionController.signal.addEventListener('abort', abort, { once: true })
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      let body: string | undefined
      try {
        body =
          requestBody === undefined ? undefined : JSON.stringify(requestBody)
      } catch {
        throw new ApiError(
          'configuration',
          'Тело запроса не сериализуется в JSON',
        )
      }
      const response = await fetcher(url.toString(), {
        method,
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : { body, headers: { 'Content-Type': 'application/json' } }),
      })
      controller.signal.throwIfAborted()
      if (!response.ok) {
        throw new ApiError(
          'http',
          `Ошибка HTTP ${response.status}`,
          response.status,
        )
      }

      let data: unknown
      try {
        if (allowEmptyResponse) {
          const text = await response.text()
          data = text.trim() ? JSON.parse(text) : null
        } else {
          data = await response.json()
        }
      } catch {
        throw new ApiError(
          'invalid-response',
          'Ответ API не содержит корректный JSON',
        )
      }
      controller.signal.throwIfAborted()
      if (isApiFailure(data)) {
        throw new ApiError('api', 'GREEN-API не смог выполнить операцию')
      }

      try {
        return parse(data)
      } catch {
        throw new ApiError(
          'invalid-response',
          'Ответ API имеет неожиданную структуру',
        )
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(
          timedOut ? 'timeout' : 'aborted',
          timedOut ? 'Время ожидания ответа истекло' : 'Запрос отменён',
        )
      }

      if (error instanceof ApiError) throw error

      // Не передаём исходные ошибки транспорта: они могут содержать URL с токеном.
      throw new ApiError('network', 'Не удалось связаться с GREEN-API')
    } finally {
      clearTimeout(timer)
      sessionController.signal.removeEventListener('abort', abort)
      signal?.removeEventListener('abort', abort)
    }
  }

  return { request, dispose: () => sessionController.abort() }
}
