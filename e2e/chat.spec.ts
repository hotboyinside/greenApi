import { expect, test } from '@playwright/test'
import { mockGreenApi } from './helpers/mockGreenApi.ts'

test('создаёт чат по номеру получателя и открывает переписку', async ({
  page,
}) => {
  const phoneNumber = '79991234567'
  await mockGreenApi(page, {
    phoneNumber: Number(phoneNumber),
    chatId: 'test-recipient-chat',
  })

  await page.goto('/')

  await page.getByLabel('idInstance', { exact: true }).fill('123456')
  await page.getByLabel('apiTokenInstance', { exact: true }).fill('test-token')
  await page.getByRole('button', { name: 'Подключиться', exact: true }).click()

  await page.getByRole('button', { name: 'Новый чат', exact: true }).click()

  const phoneInput = page.getByLabel('Номер получателя', { exact: true })
  await expect(phoneInput).toBeFocused()
  await phoneInput.fill(phoneNumber)

  await page.getByRole('button', { name: 'Создать чат', exact: true }).click()

  const chatButton = page.getByRole('button', {
    name: phoneNumber,
    exact: true,
  })
  await expect(chatButton).toHaveCount(1)
  await expect(chatButton).toBeVisible()
  await expect(chatButton).toHaveAttribute('aria-pressed', 'true')

  await expect(
    page.getByRole('heading', { name: phoneNumber, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('log', { name: `Сообщения ${phoneNumber}`, exact: true }),
  ).toContainText('Пока нет сообщений.')
  await expect(page.getByLabel('Сообщение', { exact: true })).toBeEditable()
  await expect(phoneInput).toHaveCount(0)
})

test('отправляет текст, получает ответ и выходит из подключения', async ({
  page,
}) => {
  const phoneNumber = '79991234567'
  const outgoingText = 'Привет из браузерного теста'
  const incomingText = 'Привет, сообщение получено'
  const apiState = await mockGreenApi(
    page,
    { phoneNumber: Number(phoneNumber), chatId: 'test-recipient-chat' },
    { outgoingText, incomingText },
  )

  await page.goto('/')

  await page.getByLabel('idInstance', { exact: true }).fill('123456')
  await page.getByLabel('apiTokenInstance', { exact: true }).fill('test-token')
  await page.getByRole('button', { name: 'Подключиться', exact: true }).click()

  await page.getByRole('button', { name: 'Новый чат', exact: true }).click()
  await page.getByLabel('Номер получателя', { exact: true }).fill(phoneNumber)
  await page.getByRole('button', { name: 'Создать чат', exact: true }).click()

  const messageInput = page.getByLabel('Сообщение', { exact: true })
  await messageInput.fill(outgoingText)
  await page.getByRole('button', { name: 'Отправить', exact: true }).click()

  const messages = page.getByRole('log', {
    name: `Сообщения ${phoneNumber}`,
    exact: true,
  })
  await expect(messages.getByText(outgoingText, { exact: true })).toHaveCount(1)
  await expect(messages.getByText(outgoingText, { exact: true })).toBeVisible()
  await expect(messageInput).toHaveValue('')
  await expect(messageInput).toBeFocused()

  await expect(messages.getByText(incomingText, { exact: true })).toHaveCount(1)
  await expect(messages.getByText(incomingText, { exact: true })).toBeVisible()
  await expect.poll(() => apiState.deletedReceiptIds).toEqual([1])
  expect(apiState.sendCount).toBe(1)

  await expect(
    page.getByRole('button', { name: phoneNumber, exact: true }),
  ).toHaveAccessibleDescription(incomingText)

  await page.getByRole('button', { name: 'Выйти', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'Подключение к MAX', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('idInstance', { exact: true })).toHaveValue('')
  await expect(
    page.getByLabel('apiTokenInstance', { exact: true }),
  ).toHaveValue('')
  await expect(messages).toHaveCount(0)
})
