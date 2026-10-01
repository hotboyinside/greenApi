export interface SendMessageInput {
  chatId: string
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

export function parseSendMessage(data: unknown): SendMessageResponse {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('idMessage' in data) ||
    typeof data.idMessage !== 'string' ||
    !data.idMessage.trim()
  ) {
    throw new Error('Некорректный ответ отправки сообщения')
  }
  return { idMessage: data.idMessage }
}
