import { parseEnv } from './env'
import type { EnvResult } from './env'

export function readEnv(): EnvResult {
  return parseEnv({ VITE_GREEN_API_URL: import.meta.env.VITE_GREEN_API_URL })
}
