import * as yup from 'yup'

export const messageSchema = yup.object({
  message: yup
    .string()
    .required('Введите сообщение')
    .max(4000, 'Максимум 4000 символов')
    .test('not-blank', 'Введите сообщение', (value) => Boolean(value?.trim())),
})

export type MessageValues = yup.InferType<typeof messageSchema>
