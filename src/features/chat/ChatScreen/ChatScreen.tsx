import { useCallback, useState } from 'react'
import type { ApiClient, IncomingTextMessage } from '../../../shared/api'
import { Conversation } from '../Conversation'
import { useNotifications } from '../hooks'
import { NewChatForm } from '../NewChatForm'
import type { Chat, ChatMessage } from '../types'
import styles from './ChatScreen.module.css'

const EMPTY_MESSAGES: ChatMessage[] = []

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
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})

  const addMessage = useCallback((chatId: string, message: ChatMessage) => {
    setMessages((current) => {
      const previous = Object.hasOwn(current, chatId) ? current[chatId] : []
      if (previous.some((item) => item.idMessage === message.idMessage))
        return current
      return { ...current, [chatId]: [...previous, message] }
    })
  }, [])

  const receiveMessage = useCallback(
    (message: IncomingTextMessage) => {
      setChats((current) =>
        current.some((chat) => chat.chatId === message.chatId)
          ? current
          : [
              ...current,
              {
                chatId: message.chatId,
                phoneNumber: message.phoneNumber,
                name: message.name,
              },
            ],
      )
      addMessage(message.chatId, {
        idMessage: message.idMessage,
        text: message.text,
        direction: 'incoming',
      })
    },
    [addMessage],
  )

  const pollingError = useNotifications(client, receiveMessage)
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

        {pollingError && (
          <p className={styles.error} role="alert">
            {pollingError}
          </p>
        )}

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
                {chat.name ?? chat.phoneNumber}
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
              messages={
                Object.hasOwn(messages, chat.chatId)
                  ? messages[chat.chatId]
                  : EMPTY_MESSAGES
              }
              onMessageSent={(message) => addMessage(chat.chatId, message)}
            />
          </div>
        ))}
      </section>
    </main>
  )
}
