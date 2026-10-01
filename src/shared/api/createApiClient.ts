import { createApiTransport } from './createApiTransport'
import type { ApiClientOptions } from './createApiTransport'
import { parseStateInstance } from './stateInstance'
import type { StateInstanceResponse } from './stateInstance'
import { parseCheckAccount } from './checkAccount'
import type { CheckAccountResponse } from './checkAccount'
import { parseSendMessage } from './sendMessage'
import type { SendMessageInput, SendMessageResponse } from './sendMessage'

export type { ApiClientOptions } from './createApiTransport'

export interface ApiCallOptions {
  signal?: AbortSignal
}

export interface ApiClient {
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
