export type ApiErrorCode =
  | 'configuration'
  | 'http'
  | 'network'
  | 'invalid-response'
  | 'api'
  | 'timeout'
  | 'aborted'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status?: number

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
