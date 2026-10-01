// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { ToastProvider } from './components/Toast'
import { StrictMode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render as renderReact,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'

vi.mock('./features/chat/hooks', () => ({ useNotifications: () => null }))

beforeEach(() => {
  vi.stubEnv('VITE_GREEN_API_URL', 'https://example.test')
})

afterEach(() => {
  cleanup()
})

async function fillCredentials() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('idInstance'), '123')
  await user.type(screen.getByLabelText('apiTokenInstance'), 'test-token')
  return user
}

describe('Подключение', () => {
  test('показывает ошибки пустых полей и фокусирует первое поле без запроса', async () => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    expect(screen.getByLabelText('apiTokenInstance')).toHaveAttribute(
      'type',
      'password',
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByText('Введите idInstance')).toBeInTheDocument()
    expect(screen.getByText('Введите apiTokenInstance')).toBeInTheDocument()
    expect(screen.getByLabelText('idInstance')).toHaveFocus()
    expect(screen.getByLabelText('idInstance')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('проверяет idInstance и перепроверяет исправленное поле', async () => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('idInstance'), '12abc')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'test-token')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'idInstance должен содержать только цифры',
    )
    expect(screen.getByLabelText('idInstance')).toHaveFocus()
    expect(fetcher).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('idInstance'))
    await user.type(screen.getByLabelText('idInstance'), '123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('idInstance')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
  })

  test('отклоняет пробельный токен', async () => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('idInstance'), '123')
    await user.type(screen.getByLabelText('apiTokenInstance'), '   ')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Введите apiTokenInstance',
    )
    expect(screen.getByLabelText('apiTokenInstance')).toHaveFocus()
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('убирает пробелы по краям учётных данных перед отправкой', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ stateInstance: 'authorized' }))
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('idInstance'), ' 123 ')
    await user.type(screen.getByLabelText('apiTokenInstance'), ' test-token ')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(
      await screen.findByRole('heading', { name: 'Вы подключены к MAX' }),
    ).toBeInTheDocument()
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://example.test/waInstance123/getStateInstance/test-token',
    )
  })

  test('подключается, выходит и очищает поля учётных данных', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ stateInstance: 'authorized' })),
      )
    vi.stubGlobal('fetch', fetcher)
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    const user = await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(
      await screen.findByRole('heading', { name: 'Вы подключены к MAX' }),
    ).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://example.test/waInstance123/getStateInstance/test-token',
    )
    await user.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(screen.getByLabelText('idInstance')).toHaveValue('')
    expect(screen.getByLabelText('apiTokenInstance')).toHaveValue('')
    await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(
      await screen.findByRole('heading', { name: 'Вы подключены к MAX' }),
    ).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  test.each([
    { state: 'notAuthorized', text: 'Инстанс не авторизован' },
    { state: 'starting', text: 'Инстанс запускается' },
    { state: 'blocked', text: 'Аккаунт MAX заблокирован' },
    { state: 'suspended', text: 'временные ограничения' },
    { state: 'pendingPassword', text: 'пароль двухфакторной' },
  ])(
    'объясняет состояние $state и оставляет форму',
    async ({ state, text }) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ stateInstance: state })),
      )
      render(<App />)
      const user = await fillCredentials()
      await user.click(screen.getByRole('button', { name: 'Подключиться' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(text)
      expect(screen.getByRole('button', { name: 'Подключиться' })).toBeEnabled()
      expect(
        screen.queryByRole('button', { name: 'Выйти' }),
      ).not.toBeInTheDocument()
    },
  )

  test('показывает ошибку учётных данных и позволяет повторить подключение', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    const user = await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Проверьте idInstance и apiTokenInstance',
    )
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(
      await screen.findByRole('heading', { name: 'Вы подключены к MAX' }),
    ).toBeInTheDocument()
  })

  test('показывает безопасную сетевую ошибку', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('secret-token')),
    )
    render(<App />)
    const user = await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось связаться с GREEN-API',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('secret-token')
  })

  test('объясняет отсутствие адреса API без сетевого запроса', async () => {
    vi.stubEnv('VITE_GREEN_API_URL', '')
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    const user = await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'VITE_GREEN_API_URL',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('блокирует повторную отправку и отменяет запрос при размонтировании', async () => {
    let resolveResponse: ((response: Response) => void) | undefined
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    vi.stubGlobal('fetch', fetcher)
    const view = render(<App />)
    const user = await fillCredentials()
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))
    expect(screen.getByRole('button', { name: 'Подключаемся…' })).toBeDisabled()
    expect(screen.getByLabelText('idInstance')).toBeDisabled()
    const form = screen.getByLabelText('idInstance').closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)
    expect(fetcher).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    await act(async () => {
      resolveResponse?.(Response.json({ stateInstance: 'authorized' }))
      await Promise.resolve()
    })
    expect(
      screen.queryByRole('heading', { name: 'Вы подключены к MAX' }),
    ).not.toBeInTheDocument()
  })
})

function render(ui: ReactNode) {
  return renderReact(ui, { wrapper: ToastProvider })
}
