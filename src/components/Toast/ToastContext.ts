import { createContext } from 'react'
import type { ToastActions } from './types'

export const ToastContext = createContext<ToastActions | null>(null)
