export interface ToastMessage {
  id: number
  text: string
  closing: boolean
}

export interface ToastActions {
  showError: (text: string) => void
  closeToast: () => void
}
