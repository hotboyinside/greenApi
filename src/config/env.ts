import { object, string, ValidationError } from 'yup'

const missingUrlMessage =
  'Не задан адрес API. Укажите VITE_GREEN_API_URL и перезапустите приложение.'
const invalidUrlMessage =
  'Укажите в VITE_GREEN_API_URL корректный HTTPS-адрес API без учётных данных, параметров и фрагмента.'

const envSchema = object({
  VITE_GREEN_API_URL: string()
    .trim()
    .required(missingUrlMessage)
    .test('api-url', invalidUrlMessage, (value) => {
      if (!value) return true

      try {
        const url = new URL(value)

        return (
          url.protocol === 'https:' &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        )
      } catch {
        return false
      }
    }),
})

export interface EnvConfig {
  greenApiUrl: string
}

export type EnvResult =
  { success: true; data: EnvConfig } | { success: false; error: string }

export function parseEnv(input: unknown): EnvResult {
  try {
    const { VITE_GREEN_API_URL } = envSchema.validateSync(input)

    return { success: true, data: { greenApiUrl: VITE_GREEN_API_URL } }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: 'Не удалось прочитать настройки приложения.',
    }
  }
}

export function readEnv(): EnvResult {
  return parseEnv({ VITE_GREEN_API_URL: import.meta.env.VITE_GREEN_API_URL })
}
