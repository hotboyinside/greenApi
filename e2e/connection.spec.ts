import { expect, test } from '@playwright/test'
import { mockGreenApi } from './helpers/mockGreenApi.ts'

test('показывает форму подключения', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Подключение к MAX',
      exact: true,
    }),
  ).toBeVisible()

  await expect(page.getByLabel('idInstance', { exact: true })).toBeVisible()

  await expect(
    page.getByLabel('apiTokenInstance', { exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', {
      name: 'Подключиться',
      exact: true,
    }),
  ).toBeEnabled()
})

test('подключается и открывает экран чатов', async ({ page }) => {
  await mockGreenApi(page)

  await page.goto('/')

  await page.getByLabel('idInstance', { exact: true }).fill('123456')

  await page.getByLabel('apiTokenInstance', { exact: true }).fill('test-token')

  await page.getByRole('button', { name: 'Подключиться', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'Чаты', exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'Выйти', exact: true }),
  ).toBeVisible()
})
