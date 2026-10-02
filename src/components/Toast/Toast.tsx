import { createPortal } from 'react-dom'
import type { ToastMessage } from './types'
import styles from './Toast.module.css'

interface ToastProps {
  message: ToastMessage | null
  onClose: () => void
  onExited: (id: number) => void
}

export function Toast({ message, onClose, onExited }: ToastProps) {
  const { id, text, closing } = message ?? {}

  return createPortal(
    <div
      className={styles.container}
      role={message && !closing ? 'alert' : undefined}
      aria-live="assertive"
      aria-atomic="true"
    >
      {message && (
        <div
          className={styles.toast}
          key={id}
          data-state={closing ? 'closing' : 'open'}
          aria-hidden={closing}
          onAnimationEnd={(event) => {
            const { target, currentTarget, animationName } = event
            if (
              target === currentTarget &&
              closing &&
              animationName === styles.exit
            )
              onExited(message.id)
          }}
        >
          <p>{text}</p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть уведомление"
            disabled={closing}
          >
            ×
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
