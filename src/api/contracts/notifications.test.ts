import { expect, test } from 'vitest'
import { parseNotification } from './notifications'

const body = {
  typeWebhook: 'incomingMessageReceived',
  idMessage: 'msg-1',
  timestamp: 1763115112,
  senderData: {
    chatId: '10000000',
    chatName: 'Павел',
    senderPhoneNumber: 79991234567,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет\nMAX 😃' },
  },
}

test('принимает текст со ссылкой', () => {
  expect(
    parseNotification({
      receiptId: 1,
      body: {
        ...body,
        messageData: {
          typeMessage: 'extendedTextMessage',
          extendedTextMessageData: { text: 'https://example.test' },
        },
      },
    })?.message?.text,
  ).toBe('https://example.test')
})

test.each([
  { typeWebhook: 'outgoingMessageStatus' },
  { ...body, messageData: { typeMessage: 'imageMessage' } },
])('пропускает неподдерживаемые события %j', (body) => {
  expect(parseNotification({ receiptId: 1, body })).toEqual({
    receiptId: 1,
    message: null,
  })
})
