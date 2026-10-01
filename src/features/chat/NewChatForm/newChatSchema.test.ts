import { expect, test } from 'vitest'
import { newChatSchema } from './newChatSchema'

test.each(['79991234567', '375291234567', ' 79991234567 '])(
  'принимает номер %s и удаляет пробелы по краям',
  async (phoneNumber) => {
    await expect(newChatSchema.validate({ phoneNumber })).resolves.toEqual({
      phoneNumber: phoneNumber.trim(),
    })
  },
)

test.each([
  '',
  '   ',
  '0',
  '-79991234567',
  '7999123456',
  '89991234567',
  '37529123456',
  '79991234567.5',
  'NaN',
  'Infinity',
  '+79991234567',
  '7 999 123 45 67',
  '799912345678',
  '3752912345678',
])('отклоняет неверный номер %j', async (phoneNumber) => {
  await expect(newChatSchema.validate({ phoneNumber })).rejects.toMatchObject({
    name: 'ValidationError',
    path: 'phoneNumber',
  })
})
