// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { ToastProvider } from '../../../components/Toast'
import { StrictMode } from 'react'
import {
  act,
  cleanup,
  render as renderReact,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createApiClient } from '../../../api'
import type { Notification } from '../../../api'
import { ChatScreen } from '.'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const message = {
  chatId: 'canonical-id',
  idMessage: 'incoming-1',
  text: 'Ответ MAX',
  timestamp: 123,
  phoneNumber: '79991234567',
  name: 'Павел',
}

function setup() {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    idInstance: '123',
    apiTokenInstance: 'test-token',
  })
  const receive = vi
    .spyOn(client, 'receiveNotification')
    .mockResolvedValue(null)
  const remove = vi
    .spyOn(client, 'deleteNotification')
    .mockResolvedValue({ result: true })
  const user = userEvent.setup()
  return { client, receive, remove, user }
}

test('начинает опрос без чатов в StrictMode, создаёт чат и исключает дубликаты после ошибки удаления', async () => {
  const s = setup()
  s.receive
    .mockResolvedValueOnce({ receiptId: 1, message })
    .mockResolvedValueOnce({ receiptId: 1, message })
  s.remove.mockRejectedValueOnce(new Error('secret-token'))
  const view = render(
    <StrictMode>
      <ChatScreen
        client={s.client}
        idInstance="123"
        onDisconnect={() => undefined}
      />
    </StrictMode>,
  )
  await act(async () => {
    await Promise.resolve()
  })
  expect(s.receive).toHaveBeenCalledTimes(1)
  const chatButton = screen.getByRole('button', { name: 'Павел' })
  expect(chatButton).toHaveAccessibleDescription('Ответ MAX')
  await s.user.click(chatButton)
  expect(
    within(screen.getByRole('log')).getByText('Ответ MAX'),
  ).toBeInTheDocument()
  await waitFor(() => expect(s.remove).toHaveBeenCalledTimes(2), {
    timeout: 3000,
  })
  expect(
    within(screen.getByRole('log')).getAllByText('Ответ MAX'),
  ).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Павел' })).toHaveLength(1)
  expect(s.remove).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  const signal = s.receive.mock.calls[0]?.[0]?.signal
  view.unmount()
  expect(signal?.aborted).toBe(true)
  await act(async () => {
    await Promise.resolve()
  })
  expect(s.receive).toHaveBeenCalledTimes(2)
})

test('добавляет ответ в созданный по номеру чат, сохраняя исходящий текст и черновик', async () => {
  const s = setup()
  let resolveNotification: ((value: Notification | null) => void) | undefined
  s.receive.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveNotification = resolve
      }),
  )
  vi.spyOn(s.client, 'checkAccount').mockResolvedValue({
    exist: true,
    chatId: 'canonical-id',
    fromCache: true,
  })
  vi.spyOn(s.client, 'sendMessage').mockResolvedValue({
    idMessage: 'outgoing-1',
  })
  render(
    <ChatScreen
      client={s.client}
      idInstance="123"
      onDisconnect={() => undefined}
    />,
  )
  await act(async () => {
    await Promise.resolve()
  })
  await s.user.click(screen.getByRole('button', { name: 'Новый чат' }))
  await s.user.type(screen.getByLabelText('Номер получателя'), '79991234567')
  await s.user.click(screen.getByRole('button', { name: 'Создать чат' }))
  await s.user.type(
    screen.getByRole('textbox', { name: 'Сообщение' }),
    'Привет',
  )
  await s.user.click(screen.getByRole('button', { name: 'Отправить' }))
  expect(
    screen.getByRole('button', { name: '79991234567' }),
  ).toHaveAccessibleDescription('Вы: Привет')
  await s.user.type(
    screen.getByRole('textbox', { name: 'Сообщение' }),
    'Черновик',
  )
  await act(async () => {
    resolveNotification?.({ receiptId: 1, message })
    await Promise.resolve()
  })
  const log = screen.getByRole('log')
  expect(within(log).getByText('Привет')).toBeInTheDocument()
  expect(within(log).getByText('Ответ MAX')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '79991234567' }),
  ).toHaveAccessibleDescription('Ответ MAX')
  expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue(
    'Черновик',
  )
  expect(screen.getAllByRole('button', { name: '79991234567' })).toHaveLength(1)
  expect(s.receive).toHaveBeenCalledTimes(1)
})

function render(ui: ReactNode) {
  return renderReact(ui, { wrapper: ToastProvider })
}
