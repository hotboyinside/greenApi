import { useCallback, useRef, useState } from 'react'
import { Plus, X, LogOut, MessageCircle } from 'lucide-react'
import type { ApiClient, IncomingTextMessage } from '../../../api'
import { Conversation } from '../Conversation'
import { ChatListItem } from '../ChatListItem'
import { useNotifications } from '../hooks'
import { NewChatForm } from '../NewChatForm'
import type { Chat, ChatMessage } from '../types'
import styles from './ChatScreen.module.css'
import { useToast } from '../../../components/Toast'

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
  const { showError } = useToast()
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const newChatButtonRef = useRef<HTMLButtonElement>(null)

  function closeNewChat() {
    setIsNewChatOpen(false)
    newChatButtonRef.current?.focus()
  }

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
    const { chatId } = chat
    if (chats.some((item) => item.chatId === chatId)) {
      showError('Чат с этим получателем уже существует')
    }

    setChats((current) =>
      current.some((item) => item.chatId === chatId)
        ? current
        : [...current, chat],
    )
    setActiveChatId(chatId)
    closeNewChat()
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar} aria-label="Чаты">
        <div className={styles.sidebarTop}>
          <header className={styles.header}>
            <strong>GREEN API</strong>

            <button type="button" onClick={onDisconnect}>
              <LogOut size={18} aria-hidden="true" />
              Выйти
            </button>
          </header>

          <p className={styles.connection}>Подключено · инстанс {idInstance}</p>

          {pollingError && (
            <p className={styles.error} role="alert">
              {pollingError}
            </p>
          )}

          <div className={styles.chatHeading}>
            <h1>Чаты</h1>

            <button
              ref={newChatButtonRef}
              className={styles.newChatButton}
              type="button"
              aria-label={isNewChatOpen ? 'Закрыть создание чата' : 'Новый чат'}
              aria-expanded={isNewChatOpen}
              aria-controls="new-chat-panel"
              onClick={() => {
                if (isNewChatOpen) closeNewChat()
                else setIsNewChatOpen(true)
              }}
            >
              {isNewChatOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Plus size={20} aria-hidden="true" />
              )}
            </button>
          </div>

          <div id="new-chat-panel" hidden={!isNewChatOpen}>
            {isNewChatOpen && (
              <NewChatForm
                client={client}
                chats={chats}
                onOpenChat={openChat}
              />
            )}
          </div>
        </div>

        <div className={styles.chatListArea}>
          {chats.length === 0 && (
            <p className={styles.hint}>Здесь появятся ваши переписки.</p>
          )}

          <ul className={styles.chatList}>
            {chats.map((chat) => (
              <ChatListItem
                key={chat.chatId}
                chat={chat}
                lastMessage={
                  Object.hasOwn(messages, chat.chatId)
                    ? messages[chat.chatId].at(-1)
                    : undefined
                }
                isActive={chat.chatId === activeChatId}
                onSelect={() => setActiveChatId(chat.chatId)}
              />
            ))}
          </ul>
        </div>
      </aside>

      <section
        className={activeChat ? styles.chatPane : styles.empty}
        aria-label="Переписка"
      >
        {!activeChat && (
          <div>
            <div className={styles.emptyIcon} aria-hidden="true">
              <MessageCircle size={36} />
            </div>

            <h2>Вы подключены к MAX</h2>

            <p>Выберите чат слева или создайте новый через +</p>
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
