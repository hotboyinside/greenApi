import * as yup from 'yup'

export const newChatSchema = yup.object({
  phoneNumber: yup
    .string()
    .trim()
    .required('Введите номер телефона')
    .matches(/^(?:7\d{10}|375\d{9})$/, {
      message:
        'Укажите номер РФ или Беларуси, только цифры: 79991234567 или 375291234567',
      excludeEmptyString: true,
    }),
})

export type NewChatValues = yup.InferType<typeof newChatSchema>
