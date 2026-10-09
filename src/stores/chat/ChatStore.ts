import {
  action,
  computed,
  makeObservable,
  observable,
  ObservableMap,
} from 'mobx'
import type { Chat, ChatMessage } from '../../features/chat/types'

type AddChatResult =
  | { status: 'added'; chatId: string }
  | { status: 'already-exists'; chatId: string }

export class ChatStore {
  chats: Chat[] = []
  activeChatId: string | null = null

  messages: ObservableMap<string, ChatMessage[]> = observable.map()

  constructor() {
    makeObservable(this, {
      chats: observable,
      activeChatId: observable,
      messages: observable,
      activeChat: computed,
      addChat: action,
      addMessage: action,
      selectChat: action,
    })
  }

  get activeChat(): Chat | null {
    return this.chats.find((chat) => chat.chatId === this.activeChatId) ?? null
  }

  addChat(chat: Chat): AddChatResult {
    const chatId = chat.chatId

    if (this.chats.some((c) => c.chatId === chatId)) {
      return { status: 'already-exists', chatId }
    }

    this.chats.push(chat)
    return { status: 'added', chatId }
  }

  selectChat(chatId: string) {
    if (this.chats.some((c) => c.chatId === chatId)) {
      this.activeChatId = chatId
    }
  }

  addMessage(chatId: string, message: ChatMessage) {
    let messages = this.messages.get(chatId)

    if (!messages) {
      this.messages.set(chatId, [])
      messages = this.messages.get(chatId)!
    }

    if (messages.some((item) => item.idMessage === message.idMessage)) {
      return
    }

    messages.push(message)
  }
}
