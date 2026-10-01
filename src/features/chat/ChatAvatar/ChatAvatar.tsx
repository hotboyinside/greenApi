import { UserRound } from 'lucide-react'
import styles from './ChatAvatar.module.css'

export function ChatAvatar({ name }: { name?: string }) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase('ru')

  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials || <UserRound size={22} />}
    </span>
  )
}
