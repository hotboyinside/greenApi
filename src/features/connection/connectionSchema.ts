import { object, string } from 'yup'
import type { InferType } from 'yup'

export const connectionSchema = object({
  idInstance: string().trim().required('Введите idInstance').matches(/^\d+$/, {
    message: 'idInstance должен содержать только цифры',
    excludeEmptyString: true,
  }),
  apiTokenInstance: string().trim().required('Введите apiTokenInstance'),
})

export type ConnectionValues = InferType<typeof connectionSchema>
