import { autorun } from 'mobx'
import { expect, test } from 'vitest'
import type { ChatMessage } from '../../features/chat/types'
import { ChatStore } from './ChatStore'

function setup() {
  const store = new ChatStore()
  store.addChat({ chatId: 'first', phoneNumber: '79991234567' })
  store.addChat({ chatId: 'second', phoneNumber: '79997654321' })
  return store
}

function message(
  idMessage: string,
  direction: ChatMessage['direction'] = 'incoming',
): ChatMessage {
  return { idMessage, text: `Сообщение ${idMessage}`, direction }
}

test('суммирует непрочитанные разных чатов и сбрасывает только выбранный', () => {
  const store = setup()
  const totals: number[] = []
  const stop = autorun(() => totals.push(store.totalUnreadCount))

  try {
    store.addMessage('first', message('first-1'))
    store.addMessage('first', message('first-2'))
    store.addMessage('second', message('second-1'))

    expect(store.unreadCounts.get('first')).toBe(2)
    expect(store.unreadCounts.get('second')).toBe(1)
    expect(store.totalUnreadCount).toBe(3)

    store.selectChat('first')

    expect(store.unreadCounts.get('first')).toBe(0)
    expect(store.unreadCounts.get('second')).toBe(1)
    expect(store.totalUnreadCount).toBe(1)
    expect(store.messages.get('first')).toHaveLength(2)

    store.selectChat('second')

    expect(store.totalUnreadCount).toBe(0)
    expect(store.messages.get('second')).toHaveLength(1)
    expect(totals).toEqual([0, 1, 2, 3, 1, 0])
  } finally {
    stop()
  }
})

test('повторное входящее в неактивном чате не увеличивает счётчик', () => {
  const store = setup()
  store.selectChat('first')
  const incoming = message('second-1')

  store.addMessage('second', incoming)
  store.addMessage('second', { ...incoming })

  expect(store.messages.get('second')).toHaveLength(1)
  expect(store.unreadCounts.get('second')).toBe(1)
  expect(store.totalUnreadCount).toBe(1)

  store.selectChat('second')
  store.selectChat('first')
  store.addMessage('second', { ...incoming })

  expect(store.messages.get('second')).toHaveLength(1)
  expect(store.unreadCounts.get('second')).toBe(0)
  expect(store.totalUnreadCount).toBe(0)
})

test('входящие в активном чате и исходящие сохраняются без увеличения счётчика', () => {
  const store = setup()
  store.selectChat('first')

  store.addMessage('first', message('first-1'))
  store.addMessage('first', message('first-2', 'outgoing'))
  store.addMessage('second', message('second-1', 'outgoing'))

  expect(store.totalUnreadCount).toBe(0)
  expect(store.messages.get('first')).toHaveLength(2)
  expect(store.messages.get('second')).toHaveLength(1)

  store.addMessage('second', message('second-2'))
  store.addMessage('second', message('second-3', 'outgoing'))

  expect(store.unreadCounts.get('second')).toBe(1)
  expect(store.totalUnreadCount).toBe(1)
  expect(store.messages.get('second')).toHaveLength(3)
})
