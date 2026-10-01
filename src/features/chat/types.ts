export interface Chat {
  chatId: string
  phoneNumber: string
  name?: string
}

export interface ChatMessage {
  idMessage: string
  text: string
  direction: 'incoming' | 'outgoing'
}
