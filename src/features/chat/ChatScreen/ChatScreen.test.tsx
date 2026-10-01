// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { ToastProvider } from '../../../components/Toast'
import {
  act,
  cleanup,
  fireEvent,
  render as renderReact,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createApiClient } from '../../../api'
import { ChatScreen } from '.'

afterEach(cleanup)

vi.mock('../hooks', () => ({ useNotifications: () => null }))

test('безопасно открывает чат с идентификатором, совпадающим с ключом прототипа', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ exist: true, chatId: '__proto__', fromCache: true }),
    )
  const { user } = setup(fetcher)
  await user.type(screen.getByLabelText('Номер получателя'), '79991234567')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(
    await screen.findByRole('heading', { name: '79991234567' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('log')).toHaveTextContent('Пока нет сообщений.')
})

test('результат отправки остаётся в исходном чате после переключения', async () => {
  let resolveMessage: ((response: Response) => void) | undefined
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ exist: true, chatId: 'first', fromCache: true }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveMessage = resolve
        }),
    )
    .mockResolvedValueOnce(
      Response.json({ exist: true, chatId: 'second', fromCache: true }),
    )
  const { user } = setup(fetcher)
  await user.type(screen.getByLabelText('Номер получателя'), '79991234567')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  await screen.findByRole('heading', { name: '79991234567' })
  await user.type(screen.getByLabelText('Сообщение'), 'Первому получателю')
  await user.click(screen.getByRole('button', { name: 'Отправить' }))
  await user.type(screen.getByLabelText('Номер получателя'), '79991234568')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  await screen.findByRole('heading', { name: '79991234568' })
  const secondInput = screen.getByRole('textbox', { name: 'Сообщение' })
  await user.type(secondInput, 'Черновик второго чата')
  await act(async () => {
    resolveMessage?.(Response.json({ idMessage: 'msg-1' }))
    await Promise.resolve()
  })
  expect(secondInput).toHaveFocus()
  expect(secondInput).toHaveValue('Черновик второго чата')
  expect(
    within(screen.getByRole('log')).queryByText('Первому получателю'),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '79991234567' }))
  expect(
    within(screen.getByRole('log')).getByText('Первому получателю'),
  ).toBeInTheDocument()
})

function setup(fetcher = vi.fn<typeof fetch>()) {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    idInstance: '123',
    apiTokenInstance: 'test-token',
    fetcher,
  })
  const view = render(
    <ChatScreen
      client={client}
      idInstance="123"
      onDisconnect={() => undefined}
    />,
  )
  return { ...view, fetcher, user: userEvent.setup() }
}

test('проверяет номер до запроса и фокусирует поле', async () => {
  const { user, fetcher } = setup()
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Введите номер телефона',
  )
  expect(screen.getByLabelText('Номер получателя')).toHaveFocus()
  await user.type(screen.getByLabelText('Номер получателя'), '123')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Укажите номер РФ или Беларуси',
  )
  expect(fetcher).not.toHaveBeenCalled()
})

test('открывает чат по идентификатору API и не создаёт дубликаты', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() =>
    Promise.resolve(
      Response.json({
        exist: true,
        chatId: 'canonical-chat-id',
        fromCache: true,
      }),
    ),
  )
  const { user } = setup(fetcher)
  for (let attempt = 0; attempt < 2; attempt++) {
    await user.type(screen.getByLabelText('Номер получателя'), ' 79991234567 ')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))
    expect(
      await screen.findByRole('heading', { name: '79991234567' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Номер получателя')).toHaveValue('')
  }
  expect(screen.getAllByRole('button', { name: '79991234567' })).toHaveLength(1)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Чат с этим получателем уже существует',
  )
  await user.click(screen.getByRole('button', { name: 'Закрыть уведомление' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({ phoneNumber: 79991234567 }),
  )
})

test('объясняет отсутствие аккаунта и позволяет повторить проверку после ошибки', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ exist: false, chatId: '', fromCache: true }),
    )
    .mockRejectedValueOnce(new Error('secret-token'))
    .mockResolvedValueOnce(
      Response.json({ exist: true, chatId: 'chat-id', fromCache: false }),
    )
  const { user } = setup(fetcher)
  await user.type(screen.getByLabelText('Номер получателя'), '375291234567')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'У получателя нет аккаунта MAX',
  )
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Не удалось проверить аккаунт',
  )
  expect(screen.getByRole('alert')).not.toHaveTextContent('secret-token')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(
    await screen.findByRole('heading', { name: '375291234567' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('блокирует повторный запрос и отменяет проверку при размонтировании', async () => {
  let resolveResponse: ((response: Response) => void) | undefined
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve
      }),
  )
  const { user, unmount } = setup(fetcher)
  await user.type(screen.getByLabelText('Номер получателя'), '79991234567')
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  expect(screen.getByRole('button', { name: 'Проверяем…' })).toBeDisabled()
  const form = screen.getByLabelText('Номер получателя').closest('form')
  if (!form) throw new Error('Форма не найдена')
  fireEvent.submit(form)
  expect(fetcher).toHaveBeenCalledTimes(1)
  unmount()
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  await act(async () => {
    resolveResponse?.(
      Response.json({ exist: true, chatId: 'chat-id', fromCache: true }),
    )
    await Promise.resolve()
  })
})

function render(ui: ReactNode) {
  return renderReact(ui, { wrapper: ToastProvider })
}
