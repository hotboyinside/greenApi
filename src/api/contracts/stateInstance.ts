export type StateInstance =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface StateInstanceResponse {
  stateInstance: StateInstance
}

export function parseStateInstance(data: unknown): StateInstanceResponse {
  if (typeof data !== 'object' || data === null || !('stateInstance' in data)) {
    throw new Error('Некорректный ответ состояния инстанса')
  }

  const state = data.stateInstance
  switch (state) {
    case 'notAuthorized':
    case 'authorized':
    case 'blocked':
    case 'starting':
    case 'suspended':
    case 'pendingPassword':
      return { stateInstance: state }
    default:
      throw new Error('Неизвестное состояние инстанса')
  }
}
