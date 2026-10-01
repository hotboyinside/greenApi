import { yupResolver } from '@hookform/resolvers/yup'
import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ApiClient } from '../../../api'
import { ApiError } from '../../../api'
import styles from './NewChatForm.module.css'
import type { NewChatValues } from './newChatSchema'
import { newChatSchema } from './newChatSchema'
import type { Chat } from '../types'

interface NewChatFormProps {
  client: ApiClient
  chats: Chat[]
  onOpenChat: (chat: Chat) => void
}

export function NewChatForm({ client, chats, onOpenChat }: NewChatFormProps) {
  const requestRef = useRef<AbortController | null>(null)
  const openChatRef = useRef(onOpenChat)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<NewChatValues>({
    resolver: yupResolver(newChatSchema),
    defaultValues: { phoneNumber: '' },
  })

  useEffect(() => {
    setFocus('phoneNumber')
  }, [setFocus])

  useEffect(() => {
    openChatRef.current = onOpenChat
  }, [onOpenChat])

  useEffect(
    () => () => {
      requestRef.current?.abort()
      requestRef.current = null
    },
    [client],
  )

  async function submit({ phoneNumber }: NewChatValues) {
    if (requestRef.current) return
    setError(null)
    const existingChat = chats.find((chat) => chat.phoneNumber === phoneNumber)
    if (existingChat) {
      reset()
      openChatRef.current(existingChat)
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setError(null)
    try {
      const result = await client.checkAccount(Number(phoneNumber), {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return

      if (!result.exist) {
        setError('У получателя нет аккаунта MAX')
        return
      }

      reset()
      openChatRef.current({ chatId: result.chatId, phoneNumber })
    } catch (cause) {
      if (controller.signal.aborted) return

      setError(
        cause instanceof ApiError && cause.status === 469
          ? 'Лимит проверок исчерпан. Попробуйте позже.'
          : 'Не удалось проверить аккаунт. Попробуйте ещё раз.',
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
    <form
      className={styles.newChatForm}
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSubmitting}
    >
      <label htmlFor="recipient-phone">Номер получателя</label>
      <input
        id="recipient-phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="79991234567"
        {...register('phoneNumber')}
        disabled={isSubmitting}
        aria-invalid={Boolean(errors.phoneNumber)}
        aria-describedby={
          errors.phoneNumber ? 'recipient-phone-error' : undefined
        }
      />
      {errors.phoneNumber && (
        <p id="recipient-phone-error" className={styles.error} role="alert">
          {errors.phoneNumber.message}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Проверяем…' : 'Создать чат'}
      </button>
    </form>
  )
}
