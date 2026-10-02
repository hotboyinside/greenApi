import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

interface MockRecipient {
  phoneNumber: number
  chatId: string
}

interface MockExchange {
  outgoingText: string
  incomingText: string
}

export async function mockGreenApi(
  page: Page,
  recipient?: MockRecipient,
  exchange?: MockExchange,
) {
  const receiptId = 1
  const state = { sendCount: 0, deletedReceiptIds: [] as number[] }
  let notificationReceived = false

  await page.route('https://green-api.test/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.split('/')[2]

    if (endpoint === 'getStateInstance') {
      expect(request.method()).toBe('GET')
      expect(url.pathname).toBe('/waInstance123456/getStateInstance/test-token')

      await route.fulfill({
        status: 200,
        json: { stateInstance: 'authorized' },
      })

      return
    }

    if (endpoint === 'receiveNotification') {
      expect(request.method()).toBe('GET')
      expect(url.pathname).toBe(
        '/waInstance123456/receiveNotification/test-token',
      )
      expect(url.searchParams.get('receiveTimeout')).toBe('20')

      if (
        recipient &&
        exchange &&
        state.sendCount > 0 &&
        !state.deletedReceiptIds.includes(receiptId)
      ) {
        notificationReceived = true

        await route.fulfill({
          status: 200,
          json: {
            receiptId,
            body: {
              typeWebhook: 'incomingMessageReceived',
              idMessage: 'test-incoming-message',
              timestamp: 1_700_000_000,
              senderData: {
                chatId: recipient.chatId,
                senderPhoneNumber: recipient.phoneNumber,
              },
              messageData: {
                typeMessage: 'textMessage',
                textMessageData: { textMessage: exchange.incomingText },
              },
            },
          },
        })

        return
      }

      await route.fulfill({
        status: 200,
        json: null,
      })

      return
    }

    if (endpoint === 'sendMessage' && recipient && exchange) {
      expect(request.method()).toBe('POST')
      expect(url.pathname).toBe('/waInstance123456/sendMessage/test-token')
      expect(request.postDataJSON()).toEqual({
        chatId: recipient.chatId,
        message: exchange.outgoingText,
      })
      state.sendCount++

      await route.fulfill({
        status: 200,
        json: { idMessage: 'test-outgoing-message' },
      })

      return
    }

    if (endpoint === 'deleteNotification' && recipient && exchange) {
      expect(request.method()).toBe('DELETE')
      expect(url.pathname).toBe(
        `/waInstance123456/deleteNotification/test-token/${receiptId}`,
      )
      expect(notificationReceived).toBe(true)
      state.deletedReceiptIds.push(receiptId)

      await route.fulfill({ status: 200, json: { result: true } })

      return
    }

    if (endpoint === 'checkAccount' && recipient) {
      expect(request.method()).toBe('POST')
      expect(url.pathname).toBe('/waInstance123456/checkAccount/test-token')
      expect(request.postDataJSON()).toEqual({
        phoneNumber: recipient.phoneNumber,
      })

      await route.fulfill({
        status: 200,
        json: {
          exist: true,
          chatId: recipient.chatId,
          fromCache: false,
        },
      })

      return
    }

    await route.abort()

    throw new Error(`Неожиданный метод API: ${endpoint}`)
  })

  return state
}
