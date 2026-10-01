import { useEffect, useRef, useState } from 'react'
import type { ApiClient, StateInstance } from '../../../shared/api'
import { ApiError, createApiClient } from '../../../shared/api'

export interface Session {
  idInstance: string
  client: ApiClient
}

const stateMessages: Record<Exclude<StateInstance, 'authorized'>, string> = {
  notAuthorized:
    'Инстанс не авторизован. Подключите аккаунт MAX в личном кабинете GREEN-API.',
  starting: 'Инстанс запускается. Подождите немного и попробуйте снова.',
  blocked:
    'Аккаунт MAX заблокирован. Проверьте его состояние в личном кабинете.',
  suspended:
    'На аккаунте действуют временные ограничения. Проверьте их в личном кабинете.',
  pendingPassword:
    'Для авторизации требуется пароль двухфакторной аутентификации. Завершите подключение в личном кабинете.',
}

function connectionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.code === 'http' &&
      (error.status === 401 || error.status === 403)
    ) {
      return 'Не удалось подключиться. Проверьте idInstance и apiTokenInstance, а также доступ к инстансу.'
    }
    return error.message
  }
  return 'Не удалось подключиться. Попробуйте снова.'
}

export function useConnection(baseUrl: string | undefined) {
  const [session, setSession] = useState<Session | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<ApiClient | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clientRef.current?.dispose()
      clientRef.current = null
    }
  }, [])

  async function connect(idInstance: string, apiTokenInstance: string) {
    // Ссылка блокирует повторную отправку до обновления состояния React.
    if (clientRef.current) return

    let client: ApiClient | undefined
    setError(null)
    setIsConnecting(true)

    try {
      if (!baseUrl?.trim()) {
        throw new ApiError(
          'configuration',
          'Не задан адрес API. Укажите VITE_GREEN_API_URL и перезапустите приложение.',
        )
      }

      const normalizedId = idInstance.trim()
      client = createApiClient({
        baseUrl: baseUrl.trim(),
        idInstance: normalizedId,
        apiTokenInstance,
      })
      clientRef.current = client
      const { stateInstance } = await client.getStateInstance()
      // После размонтирования результат запроса уже не относится к этой сессии.

      if (clientRef.current !== client) return

      if (stateInstance !== 'authorized') {
        setError(stateMessages[stateInstance])
        client.dispose()
        clientRef.current = null
        return
      }

      setSession({ idInstance: normalizedId, client })
    } catch (cause) {
      if (client && clientRef.current !== client) return

      client?.dispose()
      clientRef.current = null
      setError(connectionError(cause))
    } finally {
      if (
        mountedRef.current &&
        (!client || clientRef.current === client || clientRef.current === null)
      ) {
        setIsConnecting(false)
      }
    }
  }

  function disconnect() {
    clientRef.current?.dispose()
    clientRef.current = null
    setSession(null)
    setError(null)
  }

  return { session, isConnecting, error, connect, disconnect }
}
