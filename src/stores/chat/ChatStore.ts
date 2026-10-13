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
  unreadCounts: ObservableMap<string, number> = observable.map()

  constructor() {
    makeObservable(this, {
      chats: observable,
      activeChatId: observable,
      messages: observable,
      unreadCounts: observable,
      totalUnreadCount: computed,
      activeChat: computed,
      addChat: action,
      addMessage: action,
      selectChat: action,
    })
  }

  get activeChat(): Chat | null {
    return this.chats.find((chat) => chat.chatId === this.activeChatId) ?? null
  }

  get totalUnreadCount(): number {
    let total = 0

    for (const count of this.unreadCounts.values()) {
      total += count
    }

    return total
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
      this.unreadCounts.set(chatId, 0)
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

    if (message.direction === 'incoming' && chatId !== this.activeChatId) {
      const currentUnreadCount = this.unreadCounts.get(chatId) ?? 0
      this.unreadCounts.set(chatId, currentUnreadCount + 1)
    }
  }
}
