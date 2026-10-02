import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('проверяет и обрезает пробелы в адресе API', () => {
    expect(
      parseEnv({
        VITE_GREEN_API_URL: '  https://example.test/api/  ',
        OTHER: 'x',
      }),
    ).toEqual({
      success: true,
      data: { greenApiUrl: 'https://example.test/api/' },
    })
  })

  it.each([undefined, '', '   '])(
    'обрабатывает отсутствующий адрес %s',
    (url) => {
      const result = parseEnv({ VITE_GREEN_API_URL: url })
      expect(result.success).toBe(false)
      if (result.success) throw new Error('Expected invalid configuration')

      expect(result.error).toContain('VITE_GREEN_API_URL')
    },
  )

  it.each([
    'invalid',
    'http://example.test',
    'https://user:password@example.test',
    'https://example.test?token=value',
    'https://example.test#fragment',
    123,
    null,
    {},
  ])('возвращает ошибку для некорректного адреса %s', (url) => {
    expect(parseEnv({ VITE_GREEN_API_URL: url }).success).toBe(false)
  })

  it.each([null, [], 'invalid'])(
    'не выбрасывает исключение для неверного env %s',
    (input) => {
      expect(parseEnv(input).success).toBe(false)
    },
  )
})
