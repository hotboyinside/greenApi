// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ToastProvider, useToast } from '.'
import styles from './Toast.module.css'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Controls() {
  const { showError, closeToast } = useToast()

  return (
    <>
      <button onClick={() => showError('Первая ошибка')}>
        Показать первую
      </button>

      <button onClick={() => showError('Вторая ошибка')}>
        Показать вторую
      </button>

      <button onClick={closeToast}>Закрыть через контекст</button>
    </>
  )
}

function setup() {
  vi.useFakeTimers()
  const view = render(
    <StrictMode>
      <ToastProvider>
        <Controls />
      </ToastProvider>
    </StrictMode>,
  )
  fireEvent.click(screen.getByText('Показать первую'))

  return view
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function animationEnd(element: Element, animationName: string) {
  const eventType =
    !('AnimationEvent' in window) &&
    'WebkitAnimation' in document.createElement('div').style
      ? 'webkitAnimationEnd'
      : 'animationend'
  const event = new Event(eventType, { bubbles: true })
  Object.defineProperty(event, 'animationName', { value: animationName })
  fireEvent(element, event)
}

test('показывает уведомление через портал вне корня и удаляет после анимации', () => {
  const view = setup()
  const text = screen.getByText('Первая ошибка')
  const toast = text.parentElement
  if (!toast) throw new Error('Тоаст не найден')

  expect(view.container).not.toContainElement(text)
  expect(document.body).toContainElement(text)
  expect(screen.getByRole('alert')).toHaveTextContent('Первая ошибка')
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть уведомление' }))
  expect(toast).toHaveAttribute('data-state', 'closing')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(text).toBeInTheDocument()
  animationEnd(text, styles.exit)
  animationEnd(toast, styles.enter)
  expect(text).toBeInTheDocument()
  animationEnd(toast, styles.exit)
  expect(text).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})

test('начинает автозакрытие через 5 секунд и использует резервный таймер', async () => {
  setup()
  await advance(4999)
  expect(screen.getByRole('alert')).toBeInTheDocument()
  await advance(1)
  expect(screen.getByText('Первая ошибка').parentElement).toHaveAttribute(
    'data-state',
    'closing',
  )
  await advance(249)
  expect(screen.getByText('Первая ошибка')).toBeInTheDocument()
  await advance(1)
  expect(screen.queryByText('Первая ошибка')).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})

test('новый показ перезапускает таймер даже для того же текста', async () => {
  setup()
  await advance(4000)
  fireEvent.click(screen.getByText('Показать первую'))
  await advance(1000)
  expect(screen.getByRole('alert')).toHaveTextContent('Первая ошибка')
  await advance(4000)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await advance(250)
  expect(screen.queryByText('Первая ошибка')).not.toBeInTheDocument()
})

test('замена при закрытии отменяет старый таймер и повторное закрытие не продлевает анимацию', async () => {
  setup()
  fireEvent.click(screen.getByText('Закрыть через контекст'))
  await advance(100)
  fireEvent.click(screen.getByText('Закрыть через контекст'))
  fireEvent.click(screen.getByText('Показать вторую'))
  await advance(250)
  expect(screen.getByRole('alert')).toHaveTextContent('Вторая ошибка')
  expect(screen.queryByText('Первая ошибка')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Закрыть через контекст'))
  await advance(100)
  fireEvent.click(screen.getByText('Закрыть через контекст'))
  await advance(150)
  expect(screen.queryByText('Вторая ошибка')).not.toBeInTheDocument()
})

test('размонтирование удаляет портал и очищает таймер', () => {
  const view = setup()
  view.unmount()
  expect(screen.queryByText('Первая ошибка')).not.toBeInTheDocument()
  expect(vi.getTimerCount()).toBe(0)
})

test('useToast выдаёт понятную ошибку вне провайдера', () => {
  expect(() => render(<Controls />)).toThrow(
    'useToast должен использоваться внутри ToastProvider',
  )
})
