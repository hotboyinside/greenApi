import { yupResolver } from '@hookform/resolvers/yup'
import type { SubmitEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ApiClient } from '../../../shared/api'
import { ApiError } from '../../../shared/api'
import styles from './NewChatForm.module.css'
import type { NewChatValues } from './newChatSchema'
import { newChatSchema } from './newChatSchema'
import type { Chat } from '../types'

interface NewChatFormProps {
  client: ApiClient
  onOpenChat: (chat: Chat) => void
}

export function NewChatForm({ client, onOpenChat }: NewChatFormProps) {
  const requestRef = useRef<AbortController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewChatValues>({
    resolver: yupResolver(newChatSchema),
    defaultValues: { phoneNumber: '' },
  })

  useEffect(
    () => () => {
      requestRef.current?.abort()
      requestRef.current = null
    },
    [client],
  )

  async function submit({ phoneNumber }: NewChatValues) {
    if (requestRef.current) return

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

      onOpenChat({ chatId: result.chatId, phoneNumber })
      reset()
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
