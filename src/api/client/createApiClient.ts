import { createApiTransport } from '../transport'
import { API_ENDPOINTS } from '../endpoints'
import type { ApiClientOptions } from '../transport'
import {
  parseStateInstance,
  parseCheckAccount,
  parseSendMessage,
  parseNotification,
  parseDeleteNotification,
} from '../contracts'
import type {
  StateInstanceResponse,
  CheckAccountResponse,
  SendMessageInput,
  SendMessageResponse,
  Notification,
} from '../contracts'

export type { ApiClientOptions } from '../transport'

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
        endpoint: API_ENDPOINTS.receiveNotification,
        query: { receiveTimeout: 20 },
        timeoutMs: 30_000,
        allowEmptyResponse: true,
        parse: parseNotification,
        signal: callOptions.signal,
      }),
    deleteNotification: (receiptId, callOptions = {}) =>
      transport.request({
        method: 'DELETE',
        endpoint: `${API_ENDPOINTS.deleteNotification}/${receiptId}`,
        parse: parseDeleteNotification,
        signal: callOptions.signal,
      }),
    sendMessage: (input, callOptions = {}) =>
      transport.request({
        method: 'POST',
        endpoint: API_ENDPOINTS.sendMessage,
        body: input,
        parse: parseSendMessage,
        signal: callOptions.signal,
      }),
    getStateInstance: (callOptions = {}) =>
      transport.request({
        method: 'GET',
        endpoint: API_ENDPOINTS.getStateInstance,
        parse: parseStateInstance,
        signal: callOptions.signal,
      }),
    checkAccount: (phoneNumber, callOptions = {}) =>
      transport.request({
        method: 'POST',
        endpoint: API_ENDPOINTS.checkAccount,
        body: { phoneNumber },
        parse: parseCheckAccount,
        signal: callOptions.signal,
      }),
    dispose: transport.dispose,
  }
}
