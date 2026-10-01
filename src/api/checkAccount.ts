export type CheckAccountResponse =
  | { exist: true; chatId: string; fromCache: boolean }
  | { exist: false; chatId: ''; fromCache: boolean }

export function parseCheckAccount(data: unknown): CheckAccountResponse {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('exist' in data) ||
    typeof data.exist !== 'boolean' ||
    !('chatId' in data) ||
    typeof data.chatId !== 'string' ||
    !('fromCache' in data) ||
    typeof data.fromCache !== 'boolean'
  ) {
    throw new Error('Некорректный ответ проверки аккаунта')
  }

  if (data.exist && data.chatId.trim()) {
    return { exist: true, chatId: data.chatId, fromCache: data.fromCache }
  }
  if (!data.exist && data.chatId === '') {
    return { exist: false, chatId: '', fromCache: data.fromCache }
  }
  throw new Error('Ответ проверки аккаунта содержит противоречивые данные')
}
