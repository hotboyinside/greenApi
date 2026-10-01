import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import type { SubmitEvent } from 'react'
import { connectionSchema } from './connectionSchema'
import type { ConnectionValues } from './connectionSchema'
import styles from './Connection.module.css'

interface ConnectionFormProps {
  isConnecting: boolean
  error: string | null
  onConnect: (idInstance: string, token: string) => Promise<void>
}

export function ConnectionForm({
  isConnecting,
  error,
  onConnect,
}: ConnectionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConnectionValues>({
    resolver: yupResolver(connectionSchema),
    defaultValues: { idInstance: '', apiTokenInstance: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })
  const isBusy = isConnecting || isSubmitting

  async function submit(values: ConnectionValues) {
    if (isConnecting) return
    await onConnect(values.idInstance, values.apiTokenInstance)
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (isBusy) {
      event.preventDefault()
      return
    }
    void handleSubmit(submit)(event)
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="connection-title">
        <span className={styles.brand}>GREEN API</span>
        <h1 id="connection-title">Подключение к MAX</h1>
        <p className={styles.description}>
          Введите данные инстанса из личного кабинета GREEN-API.
        </p>
        <form onSubmit={onSubmit} aria-busy={isBusy} noValidate>
          <fieldset className={styles.fields} disabled={isBusy}>
            <label htmlFor="instance-id">idInstance</label>
            <input
              id="instance-id"
              {...register('idInstance')}
              inputMode="numeric"
              autoComplete="off"
              required
              aria-invalid={Boolean(errors.idInstance)}
              aria-describedby={
                errors.idInstance ? 'instance-id-error' : undefined
              }
              placeholder="Идентификатор инстанса"
            />
            {errors.idInstance && (
              <p id="instance-id-error" className={styles.error} role="alert">
                {errors.idInstance.message}
              </p>
            )}
            <label htmlFor="instance-token">apiTokenInstance</label>
            <input
              id="instance-token"
              {...register('apiTokenInstance')}
              type="password"
              autoComplete="off"
              required
              aria-invalid={Boolean(errors.apiTokenInstance)}
              aria-describedby={
                errors.apiTokenInstance ? 'instance-token-error' : undefined
              }
              placeholder="Токен доступа"
            />
            {errors.apiTokenInstance && (
              <p
                id="instance-token-error"
                className={styles.error}
                role="alert"
              >
                {errors.apiTokenInstance.message}
              </p>
            )}
          </fieldset>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isBusy}
          >
            {isBusy ? 'Подключаемся…' : 'Подключиться'}
          </button>
          <p className={styles.note} role="status">
            {isBusy
              ? 'Проверяем состояние инстанса…'
              : 'Данные используются только в текущей сессии.'}
          </p>
        </form>
      </section>
    </main>
  )
}
