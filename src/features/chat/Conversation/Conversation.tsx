import { yupResolver } from '@hookform/resolvers/yup'
import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ApiClient } from '../../../shared/api'
import { ApiError } from '../../../shared/api'
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
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef(isActive)
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<MessageValues>({
    resolver: yupResolver(messageSchema),
    defaultValues: { message: '' },
  })

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
      const result = await client.sendMessage(
        { chatId: chat.chatId, message },
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return

      onMessageSent({
        idMessage: result.idMessage,
        text: message,
        direction: 'outgoing',
      })
      reset()
      if (activeRef.current) setFocus('message')
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
      <h2>{chat.name ?? chat.phoneNumber}</h2>
      <div
        className={styles.messages}
        role="log"
        aria-label={`Сообщения ${chat.phoneNumber}`}
      >
        {messages.length === 0 && (
          <p className={styles.hint}>Пока нет сообщений.</p>
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
      <form
        className={styles.messageForm}
        onSubmit={onSubmit}
        noValidate
        aria-busy={isSubmitting}
      >
        <label htmlFor={`message-${chat.chatId}`}>Сообщение</label>
        <textarea
          id={`message-${chat.chatId}`}
          {...register('message')}
          readOnly={isSubmitting}
          rows={3}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? `message-error-${chat.chatId}` : undefined
          }
        />

        {errors.message && (
          <p
            id={`message-error-${chat.chatId}`}
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

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Отправляем…' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}
