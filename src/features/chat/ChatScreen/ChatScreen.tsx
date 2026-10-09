import { LogOut, MessageCircle, Plus, X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useRef, useState } from 'react'
import type { ApiClient, IncomingTextMessage } from '../../../api'
import { useToast } from '../../../components/Toast'
import { ChatStore } from '../../../stores/chat/ChatStore'
import { ChatListItem } from '../ChatListItem'
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

export const ChatScreen = observer(
  ({ client, idInstance, onDisconnect }: ChatScreenProps) => {
    const [chatStore] = useState(() => new ChatStore())
    const { showError } = useToast()
    const [isNewChatOpen, setIsNewChatOpen] = useState(false)
    const newChatButtonRef = useRef<HTMLButtonElement>(null)

    function closeNewChat() {
      setIsNewChatOpen(false)
      newChatButtonRef.current?.focus()
    }

    const receiveMessage = useCallback(
      (message: IncomingTextMessage) => {
        chatStore.addChat({
          chatId: message.chatId,
          phoneNumber: message.phoneNumber,
          name: message.name,
        })

        chatStore.addMessage(message.chatId, {
          idMessage: message.idMessage,
          text: message.text,
          direction: 'incoming',
        })
      },
      [chatStore],
    )

    const pollingError = useNotifications(client, receiveMessage)
    const activeChat = chatStore.activeChat

    function openChat(chat: Chat) {
      const addedResult = chatStore.addChat(chat)

      if (addedResult.status === 'already-exists') {
        showError('Чат с этим получателем уже существует')
      }
      chatStore.selectChat(chat.chatId)
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

            <p className={styles.connection}>
              Подключено · инстанс {idInstance}
            </p>

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
                aria-label={
                  isNewChatOpen ? 'Закрыть создание чата' : 'Новый чат'
                }
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
                  chats={chatStore.chats}
                  onOpenChat={openChat}
                />
              )}
            </div>
          </div>

          <div className={styles.chatListArea}>
            {chatStore.chats.length === 0 && (
              <p className={styles.hint}>Здесь появятся ваши переписки.</p>
            )}

            <ul className={styles.chatList}>
              {chatStore.chats.map((chat) => (
                <ChatListItem
                  key={chat.chatId}
                  chat={chat}
                  lastMessage={chatStore.messages.get(chat.chatId)?.at(-1)}
                  isActive={chat.chatId === activeChat?.chatId}
                  onSelect={() => {
                    chatStore.selectChat(chat.chatId)
                  }}
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

          {chatStore.chats.map((chat) => (
            <div key={chat.chatId} hidden={chat.chatId !== activeChat?.chatId}>
              <Conversation
                client={client}
                chat={chat}
                isActive={chat.chatId === activeChat?.chatId}
                messages={chatStore.messages.get(chat.chatId) ?? EMPTY_MESSAGES}
                onMessageSent={(message) =>
                  chatStore.addMessage(chat.chatId, message)
                }
              />
            </div>
          ))}
        </section>
      </main>
    )
  },
)
