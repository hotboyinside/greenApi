import { observer } from 'mobx-react-lite'
import { useId } from 'react'
import { ChatAvatar } from '../ChatAvatar'
import type { Chat, ChatMessage } from '../types'
import styles from './ChatListItem.module.css'

interface ChatListItemProps {
  chat: Chat
  lastMessage?: ChatMessage
  isActive: boolean
  unreadCount: number
  onSelect: () => void
}

export const ChatListItem = observer(
  ({
    chat,
    lastMessage,
    isActive,
    unreadCount,
    onSelect,
  }: ChatListItemProps) => {
    const previewId = useId()
    const unreadId = useId()
    const { name, phoneNumber } = chat
    const title = name ?? phoneNumber
    let preview = 'Пока нет сообщений'

    if (lastMessage) {
      const { direction, text } = lastMessage
      preview = text.replace(/\s+/g, ' ').trim()

      if (direction === 'outgoing') {
        preview = `Вы: ${preview}`
      }
    }

    return (
      <li>
        <button
          type="button"
          className={styles.row}
          aria-label={title}
          aria-describedby={
            unreadCount > 0 ? `${previewId} ${unreadId}` : previewId
          }
          aria-pressed={isActive}
          onClick={onSelect}
        >
          <ChatAvatar name={name} />

          <span className={styles.content}>
            <span className={styles.title} title={title}>
              {title}
            </span>

            <span className={styles.preview} id={previewId} title={preview}>
              {preview}
            </span>
          </span>
          {unreadCount > 0 && (
            <span
              className={styles.unreadBadge}
              id={unreadId}
              aria-label={`Непрочитанных: ${unreadCount}`}
            >
              <span className={styles.srOnly}>Непрочитанных:</span>{' '}
              {unreadCount}
            </span>
          )}
        </button>
      </li>
    )
  },
)
