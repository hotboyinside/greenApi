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

  const { messageData } = body
  const { typeMessage, textMessageData, extendedTextMessageData } = messageData
  if (typeMessage !== 'textMessage' && typeMessage !== 'extendedTextMessage')
    return { receiptId, message: null }

  const textData =
    typeMessage === 'textMessage' ? textMessageData : extendedTextMessageData
  let text: unknown

  if (record(textData)) {
    if (typeMessage === 'textMessage') {
      text = textData.textMessage
    } else {
      text = textData.text
    }
  }

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

  const { idMessage, timestamp } = body
  const { chatId, senderPhoneNumber, chatName } = body.senderData

  return {
    receiptId,
    message: {
      chatId,
      idMessage,
      timestamp,
      text,
      phoneNumber:
        typeof senderPhoneNumber === 'number' && senderPhoneNumber > 0
          ? String(senderPhoneNumber)
          : chatId,
      name: nonempty(chatName) ? chatName : undefined,
    },
  }
}

export function parseDeleteNotification(data: unknown): { result: boolean } {
  if (!record(data) || typeof data.result !== 'boolean')
    throw new Error('Некорректный результат удаления')

  return { result: data.result }
}
