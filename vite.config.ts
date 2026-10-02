import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isE2E = mode === 'e2e'

  return {
    plugins: [react()],

    envDir: isE2E ? false : undefined,

    define: isE2E
      ? {
          'import.meta.env.VITE_GREEN_API_URL': JSON.stringify(
            'https://green-api.test',
          ),
        }
      : {},
  }
})
