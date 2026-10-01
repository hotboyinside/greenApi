import { ApiError } from './ApiError'

export interface ApiClientOptions {
  baseUrl: string
  idInstance: string
  apiTokenInstance: string
  timeoutMs?: number
  fetcher?: typeof fetch
}

export interface ApiRequest<T> {
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
  let baseUrl: URL
  try {
    baseUrl = new URL(options.baseUrl)
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

  if (!/^\d+$/.test(options.idInstance) || !options.apiTokenInstance.trim()) {
    throw new ApiError('configuration', 'Укажите idInstance и apiTokenInstance')
  }

  const apiBase = baseUrl.toString().replace(/\/$/, '')
  const idInstance = options.idInstance
  const token = options.apiTokenInstance.trim()
  const defaultTimeout = options.timeoutMs ?? 15_000
  const fetcher = options.fetcher ?? fetch
  const sessionController = new AbortController()

  async function request<T>(input: ApiRequest<T>): Promise<T> {
    const timeoutMs = input.timeoutMs ?? defaultTimeout
    if (input.method === 'GET' && input.body !== undefined) {
      throw new ApiError('configuration', 'GET-запрос не должен содержать тело')
    }
    if (sessionController.signal.aborted || input.signal?.aborted) {
      throw new ApiError('aborted', 'Запрос отменён')
    }

    const [methodName, receiptId] = input.endpoint.split('/')
    const receiptPath = receiptId === undefined ? '' : `/${receiptId}`
    const url = new URL(
      `${apiBase}/waInstance${idInstance}/${methodName}/${encodeURIComponent(token)}${receiptPath}`,
    )
    for (const [key, value] of Object.entries(input.query ?? {})) {
      url.searchParams.set(key, String(value))
    }

    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort()
    sessionController.signal.addEventListener('abort', abort, { once: true })
    input.signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      let body: string | undefined
      try {
        body = input.body === undefined ? undefined : JSON.stringify(input.body)
      } catch {
        throw new ApiError(
          'configuration',
          'Тело запроса не сериализуется в JSON',
        )
      }
      const response = await fetcher(url.toString(), {
        method: input.method,
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : { body, headers: { 'Content-Type': 'application/json' } }),
      })
      if (!response.ok) {
        throw new ApiError(
          'http',
          `Ошибка HTTP ${response.status}`,
          response.status,
        )
      }
      let data: unknown
      try {
        data = await response.json()
      } catch {
        throw new ApiError(
          'invalid-response',
          'Ответ API не содержит корректный JSON',
        )
      }
      if (isApiFailure(data)) {
        throw new ApiError('api', 'GREEN-API не смог выполнить операцию')
      }
      try {
        return input.parse(data)
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
      input.signal?.removeEventListener('abort', abort)
    }
  }

  return { request, dispose: () => sessionController.abort() }
}
