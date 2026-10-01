// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createApiClient } from '../../../api'
import { useState } from 'react'
import type { ChatMessage } from '../types'
import { Conversation } from '.'
import { messageSchema } from './messageSchema'

afterEach(cleanup)

function setup(fetcher = vi.fn<typeof fetch>()) {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    idInstance: '123',
    apiTokenInstance: 'test-token',
    fetcher,
  })
  function TestConversation() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    return (
      <Conversation
        client={client}
        chat={{ chatId: 'canonical-id', phoneNumber: '79991234567' }}
        messages={messages}
        onMessageSent={(message) =>
          setMessages((current) => [...current, message])
        }
      />
    )
  }
  const view = render(<TestConversation />)
  return { ...view, user: userEvent.setup(), fetcher }
}

test.each(['', ' \n ', 'a'.repeat(4001)])(
  'схема отклоняет пустой или слишком длинный текст %#',
  async (message) => {
    await expect(messageSchema.validate({ message })).rejects.toMatchObject({
      name: 'ValidationError',
    })
  },
)

test('схема сохраняет текст и принимает 4000 символов', async () => {
  const message = ' '.repeat(3999) + 'a'
  await expect(messageSchema.validate({ message })).resolves.toEqual({
    message,
  })
})

test('не отправляет пустое сообщение, затем добавляет успешное в переписку', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ idMessage: 'msg-1' }))
  const { user } = setup(fetcher)
  await user.click(screen.getByRole('button', { name: 'Отправить' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Введите сообщение',
  )
  expect(fetcher).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Сообщение'), 'Привет MAX')
  await user.click(screen.getByRole('button', { name: 'Отправить' }))
  expect(await screen.findByText('Привет MAX')).toBeInTheDocument()
  expect(screen.getByLabelText('Сообщение')).toHaveValue('')
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({ chatId: 'canonical-id', message: 'Привет MAX' }),
  )
})

test('при потере ответа сохраняет текст и предупреждает о возможном дубликате', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error('secret-token'))
  const { user } = setup(fetcher)
  await user.type(screen.getByLabelText('Сообщение'), 'Привет')
  await user.click(screen.getByRole('button', { name: 'Отправить' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'повтор может создать дубликат',
  )
  expect(screen.getByRole('alert')).not.toHaveTextContent('secret-token')
  expect(screen.getByLabelText('Сообщение')).toHaveValue('Привет')
  expect(screen.getByRole('log')).toHaveTextContent('Пока нет сообщений.')
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('Shift+Enter добавляет перенос, Enter отправляет текст и очищает поле', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ idMessage: 'keyboard-1' }))
  const { user } = setup(fetcher)
  const input = screen.getByRole('textbox', { name: 'Сообщение' })
  await user.type(input, 'Первая строка')
  await user.keyboard('{Shift>}{Enter}{/Shift}Вторая строка')
  expect(input).toHaveValue('Первая строка\nВторая строка')
  expect(fetcher).not.toHaveBeenCalled()
  await user.keyboard('{Enter}')
  expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({
      chatId: 'canonical-id',
      message: 'Первая строка\nВторая строка',
    }),
  )
  expect(input).toHaveValue('')
  expect(input).toHaveFocus()
})

test('не отправляет сообщение при Enter во время композиции IME', async () => {
  const { user, fetcher } = setup()
  const input = screen.getByRole('textbox', { name: 'Сообщение' })
  await user.type(input, 'Текст')
  fireEvent.compositionStart(input)
  fireEvent.keyDown(input, { key: 'Enter' })
  fireEvent.compositionEnd(input)
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
  await act(async () => {
    await Promise.resolve()
  })
  expect(fetcher).not.toHaveBeenCalled()
  expect(input).toHaveValue('Текст')
})

test('блокирует повторную отправку и отменяет запрос при выходе', async () => {
  let resolveResponse: ((response: Response) => void) | undefined
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve
      }),
  )
  const { user, unmount } = setup(fetcher)
  await user.type(screen.getByLabelText('Сообщение'), 'Привет')
  await user.click(screen.getByRole('button', { name: 'Отправить' }))
  expect(screen.getByRole('button', { name: 'Отправляем…' })).toBeDisabled()
  const form = screen.getByLabelText('Сообщение').closest('form')
  if (!form) throw new Error('Форма не найдена')
  fireEvent.submit(form)
  fireEvent.keyDown(screen.getByLabelText('Сообщение'), { key: 'Enter' })
  expect(fetcher).toHaveBeenCalledTimes(1)
  unmount()
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  await act(async () => {
    resolveResponse?.(Response.json({ idMessage: 'msg-1' }))
    await Promise.resolve()
  })
})
