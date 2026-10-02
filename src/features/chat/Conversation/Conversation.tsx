import { yupResolver } from '@hookform/resolvers/yup'
import type { SubmitEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Send, LoaderCircle, MessageCircle } from 'lucide-react'
import { ChatAvatar } from '../ChatAvatar'
import { useForm, useWatch } from 'react-hook-form'
import type { ApiClient } from '../../../api'
import { ApiError } from '../../../api'
import type { Chat, ChatMessage } from '../types'
import styles from './Conversation.module.css'
import type { MessageValues } from './messageSchema'
import { messageSchema } from './messageSchema'

export function Conversation({
  client,
  chat,
  isActive = true,
  messages,
  onMessageSent,
}: {
  client: ApiClient
  chat: Chat
  isActive?: boolean
  messages: ChatMessage[]
  onMessageSent: (message: ChatMessage) => void
}) {
  const { chatId, name, phoneNumber } = chat
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef(isActive)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const composingRef = useRef(false)
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MessageValues>({
    resolver: yupResolver(messageSchema),
    defaultValues: { message: '' },
  })
  const messageValue = useWatch({ control, name: 'message' })
  const messageField = register('message')

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !isActive) return

    const resize = () => {
      const { borderTopWidth, borderBottomWidth } = getComputedStyle(textarea)
      textarea.style.height = '0px'
      textarea.style.height = `${textarea.scrollHeight + parseFloat(borderTopWidth) + parseFloat(borderBottomWidth)}px`
    }
    resize()
    // Пересчитываем переносы при изменении ширины, в том числе у сохранённого черновика.
    if (typeof ResizeObserver === 'undefined') return

    let previousWidth = textarea.clientWidth
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== previousWidth) {
        previousWidth = textarea.clientWidth
        resize()
      }
    })
    observer.observe(textarea)

    return () => observer.disconnect()
  }, [messageValue, isActive])

  useEffect(
    () => () => {
      requestRef.current?.abort()
    },
    [client],
  )
  useEffect(() => {
    activeRef.current = isActive
    if (isActive) endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [isActive, messages])

  async function submit({ message }: MessageValues) {
    if (requestRef.current) return

    const controller = new AbortController()
    requestRef.current = controller
    setError(null)

    try {
      const { idMessage } = await client.sendMessage(
        { chatId, message },
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return

      onMessageSent({
        idMessage,
        text: message,
        direction: 'outgoing',
      })
      reset()
      // reset сбрасывает ссылки React Hook Form, поэтому используем ссылку на DOM.
      if (activeRef.current) textareaRef.current?.focus({ preventScroll: true })
    } catch (cause) {
      if (controller.signal.aborted) return

      setError(
        cause instanceof ApiError &&
          ['network', 'timeout', 'invalid-response'].includes(cause.code)
          ? 'Не удалось подтвердить отправку. Сообщение могло попасть в очередь; повтор может создать дубликат.'
          : 'Не удалось отправить сообщение. Текст сохранён, попробуйте позже.',
      )
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (isSubmitting) {
      event.preventDefault()

      return
    }

    void handleSubmit(submit)(event)
  }

  return (
    <div className={styles.conversation}>
      <header className={styles.header}>
        <ChatAvatar name={name} />

        <div className={styles.recipient}>
          <h2>{name ?? phoneNumber}</h2>

          {name && <p>{phoneNumber}</p>}
        </div>
      </header>

      <div
        className={styles.messages}
        role="log"
        aria-label={`Сообщения ${phoneNumber}`}
      >
        <div
          className={`${styles.messageList} ${messages.length === 0 ? styles.emptyMessageList : ''}`}
        >
          {messages.length === 0 && (
            <div className={styles.emptyConversation}>
              <MessageCircle size={32} aria-hidden="true" />

              <p className={styles.emptyTitle}>Пока нет сообщений.</p>

              <p>Напишите первое сообщение в поле снизу.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              className={`${styles.message} ${message.direction === 'incoming' ? styles.incoming : ''}`}
              key={message.idMessage}
            >
              <p>{message.text}</p>
            </div>
          ))}

          <div ref={endRef} />
        </div>
      </div>

      <form
        className={styles.messageForm}
        onSubmit={onSubmit}
        noValidate
        aria-busy={isSubmitting}
      >
        <div className={styles.composer}>
          <textarea
            id={`message-${chatId}`}
            {...messageField}
            ref={(element) => {
              messageField.ref(element)
              textareaRef.current = element
            }}
            aria-label="Сообщение"
            placeholder="Сообщение"
            readOnly={isSubmitting}
            rows={1}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            onKeyDown={(event) => {
              if (
                event.key !== 'Enter' ||
                event.shiftKey ||
                composingRef.current ||
                event.nativeEvent.isComposing ||
                event.keyCode === 229
              )
                return

              event.preventDefault()
              if (!isSubmitting && !requestRef.current)
                event.currentTarget.form?.requestSubmit()
            }}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message ? `message-error-${chatId}` : undefined
            }
          />

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Отправляем…' : 'Отправить'}
            title={isSubmitting ? 'Отправляем…' : 'Отправить'}
          >
            {isSubmitting ? (
              <LoaderCircle size={20} aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )}
          </button>
        </div>

        {errors.message && (
          <p
            id={`message-error-${chatId}`}
            className={styles.error}
            role="alert"
          >
            {errors.message.message}
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
