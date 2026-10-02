import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { parseEnv } from './src/config/env.ts'

export default defineConfig(({ mode }) => {
  const isE2E = mode === 'e2e'
  const isCI = mode === 'ci'
  const isPages = mode === 'pages'
  let greenApiUrl: string | undefined

  if (isE2E || isCI) {
    greenApiUrl = 'https://green-api.test'
  } else if (isPages) {
    const env = parseEnv({ VITE_GREEN_API_URL: process.env.VITE_GREEN_API_URL })
    if (!env.success) throw new Error(env.error)

    greenApiUrl = env.data.greenApiUrl
  }

  return {
    plugins: [react()],

    base: isCI || isPages ? '/greenApi/' : '/',

    envDir: isE2E || isCI || isPages ? false : undefined,

    define: greenApiUrl
      ? {
          'import.meta.env.VITE_GREEN_API_URL': JSON.stringify(greenApiUrl),
        }
      : {},
  }
})
