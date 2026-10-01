export interface IncomingTextMessage {
  chatId: string
  idMessage: string
  text: string
  timestamp: number
  phoneNumber: string
  name?: string
}

export interface Notification {
  receiptId: number
  message: IncomingTextMessage | null
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim())
}

export function parseNotification(data: unknown): Notification | null {
  if (data === null) return null

  if (
    !record(data) ||
    typeof data.receiptId !== 'number' ||
    !Number.isSafeInteger(data.receiptId) ||
    data.receiptId <= 0 ||
    !record(data.body) ||
    !nonempty(data.body.typeWebhook)
  )
    throw new Error('Некорректное уведомление')

  const { receiptId, body } = data
  if (body.typeWebhook !== 'incomingMessageReceived')
    return { receiptId, message: null }

  if (!record(body.messageData) || !nonempty(body.messageData.typeMessage))
    throw new Error('Некорректные данные сообщения')

  const messageData = body.messageData
  if (
    messageData.typeMessage !== 'textMessage' &&
    messageData.typeMessage !== 'extendedTextMessage'
  )
    return { receiptId, message: null }

  const textData =
    messageData.typeMessage === 'textMessage'
      ? messageData.textMessageData
      : messageData.extendedTextMessageData
  const text = record(textData)
    ? textData[
        messageData.typeMessage === 'textMessage' ? 'textMessage' : 'text'
      ]
    : undefined

  if (
    !record(body.senderData) ||
    !nonempty(body.senderData.chatId) ||
    !nonempty(body.idMessage) ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp) ||
    body.timestamp < 0 ||
    typeof text !== 'string'
  )
    throw new Error('Некорректный текст сообщения')

  const chatId = body.senderData.chatId
  const sender = body.senderData

  return {
    receiptId,
    message: {
      chatId,
      idMessage: body.idMessage,
      timestamp: body.timestamp,
      text,
      phoneNumber:
        typeof sender.senderPhoneNumber === 'number' &&
        sender.senderPhoneNumber > 0
          ? String(sender.senderPhoneNumber)
          : chatId,
      name: nonempty(sender.chatName) ? sender.chatName : undefined,
    },
  }
}

export function parseDeleteNotification(data: unknown): { result: boolean } {
  if (!record(data) || typeof data.result !== 'boolean')
    throw new Error('Некорректный результат удаления')
  return { result: data.result }
}
