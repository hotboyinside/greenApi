import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import styles from './ChatScreen.module.css'
import type { Chat } from '../types'
import { NewChatForm } from '../NewChatForm'
import { Conversation } from '../Conversation'

interface ChatScreenProps {
  client: ApiClient
  idInstance: string
  onDisconnect: () => void
}

export function ChatScreen({
  client,
  idInstance,
  onDisconnect,
}: ChatScreenProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const activeChat = chats.find((chat) => chat.chatId === activeChatId)

  function openChat(chat: Chat) {
    setChats((current) =>
      current.some((item) => item.chatId === chat.chatId)
        ? current
        : [...current, chat],
    )
    setActiveChatId(chat.chatId)
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar} aria-label="Чаты">
        <header className={styles.header}>
          <strong>GREEN API</strong>
          <button type="button" onClick={onDisconnect}>
            Выйти
          </button>
        </header>
        <p className={styles.connection}>Подключено · инстанс {idInstance}</p>
        <h1>Чаты</h1>
        <NewChatForm client={client} onOpenChat={openChat} />
        {chats.length === 0 && (
          <p className={styles.hint}>Здесь появятся ваши переписки.</p>
        )}
        <ul className={styles.chatList}>
          {chats.map((chat) => (
            <li key={chat.chatId}>
              <button
                type="button"
                aria-pressed={chat.chatId === activeChatId}
                onClick={() => setActiveChatId(chat.chatId)}
              >
                {chat.phoneNumber}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section
        className={activeChat ? styles.chatPane : styles.empty}
        aria-label="Переписка"
      >
        {!activeChat && (
          <div>
            <h2>Вы подключены к MAX</h2>
            <p>Пока нет открытых чатов.</p>
          </div>
        )}
        {chats.map((chat) => (
          <div key={chat.chatId} hidden={chat.chatId !== activeChatId}>
            <Conversation
              client={client}
              chat={chat}
              isActive={chat.chatId === activeChatId}
            />
          </div>
        ))}
      </section>
    </main>
  )
}
