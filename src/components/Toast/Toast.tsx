import { createPortal } from 'react-dom'
import type { ToastMessage } from './types'
import styles from './Toast.module.css'

interface ToastProps {
  message: ToastMessage | null
  onClose: () => void
  onExited: (id: number) => void
}

export function Toast({ message, onClose, onExited }: ToastProps) {
  return createPortal(
    <div
      className={styles.container}
      role={message && !message.closing ? 'alert' : undefined}
      aria-live="assertive"
      aria-atomic="true"
    >
      {message && (
        <div
          className={styles.toast}
          key={message.id}
          data-state={message.closing ? 'closing' : 'open'}
          aria-hidden={message.closing}
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              message.closing &&
              event.animationName === styles.exit
            )
              onExited(message.id)
          }}
        >
          <p>{message.text}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть уведомление"
            disabled={message.closing}
          >
            ×
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
