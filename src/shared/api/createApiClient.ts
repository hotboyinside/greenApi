import { createApiTransport } from './createApiTransport'
import type { ApiClientOptions } from './createApiTransport'
import { parseStateInstance } from './stateInstance'
import type { StateInstanceResponse } from './stateInstance'
import { parseCheckAccount } from './checkAccount'
import type { CheckAccountResponse } from './checkAccount'
import { parseSendMessage } from './sendMessage'
import type { SendMessageInput, SendMessageResponse } from './sendMessage'
import { parseNotification, parseDeleteNotification } from './notifications'
import type { Notification } from './notifications'

export type { ApiClientOptions } from './createApiTransport'

export interface ApiCallOptions {
  signal?: AbortSignal
}

export interface ApiClient {
  receiveNotification: (
    options?: ApiCallOptions,
  ) => Promise<Notification | null>
  deleteNotification: (
    receiptId: number,
    options?: ApiCallOptions,
  ) => Promise<{ result: boolean }>
  sendMessage: (
    input: SendMessageInput,
    options?: ApiCallOptions,
  ) => Promise<SendMessageResponse>
  getStateInstance: (options?: ApiCallOptions) => Promise<StateInstanceResponse>
  checkAccount: (
    phoneNumber: number,
    options?: ApiCallOptions,
  ) => Promise<CheckAccountResponse>
  dispose: () => void
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const transport = createApiTransport(options)

  return {
    receiveNotification: (callOptions = {}) =>
      transport.request({
        method: 'GET',
        endpoint: 'receiveNotification',
        query: { receiveTimeout: 20 },
        timeoutMs: 30_000,
        allowEmptyResponse: true,
        parse: parseNotification,
        signal: callOptions.signal,
      }),
    deleteNotification: (receiptId, callOptions = {}) =>
      transport.request({
        method: 'DELETE',
        endpoint: `deleteNotification/${receiptId}`,
        parse: parseDeleteNotification,
        signal: callOptions.signal,
      }),
    sendMessage: (input, callOptions = {}) =>
      transport.request({
        method: 'POST',
        endpoint: 'sendMessage',
        body: input,
        parse: parseSendMessage,
        signal: callOptions.signal,
      }),
    getStateInstance: (callOptions = {}) =>
      transport.request({
        method: 'GET',
        endpoint: 'getStateInstance',
        parse: parseStateInstance,
        signal: callOptions.signal,
      }),
    checkAccount: (phoneNumber, callOptions = {}) =>
      transport.request({
        method: 'POST',
        endpoint: 'checkAccount',
        body: { phoneNumber },
        parse: parseCheckAccount,
        signal: callOptions.signal,
      }),
    dispose: transport.dispose,
  }
}
