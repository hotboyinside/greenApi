import { useId } from 'react'
import { ChatAvatar } from '../ChatAvatar'
import type { Chat, ChatMessage } from '../types'
import styles from './ChatListItem.module.css'

interface ChatListItemProps {
  chat: Chat
  lastMessage?: ChatMessage
  isActive: boolean
  onSelect: () => void
}

export function ChatListItem({
  chat,
  lastMessage,
  isActive,
  onSelect,
}: ChatListItemProps) {
  const previewId = useId()
  const title = chat.name ?? chat.phoneNumber
  const preview = lastMessage
    ? `${lastMessage.direction === 'outgoing' ? 'Вы: ' : ''}${lastMessage.text.replace(/\s+/g, ' ').trim()}`
    : 'Пока нет сообщений'

  return (
    <li>
      <button
        type="button"
        className={styles.row}
        aria-label={title}
        aria-describedby={previewId}
        aria-pressed={isActive}
        onClick={onSelect}
      >
        <ChatAvatar name={chat.name} />
        <span className={styles.content}>
          <span className={styles.title} title={title}>
            {title}
          </span>
          <span className={styles.preview} id={previewId} title={preview}>
            {preview}
          </span>
        </span>
      </button>
    </li>
  )
}
