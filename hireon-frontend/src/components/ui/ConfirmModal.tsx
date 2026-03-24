import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  danger?: boolean
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmModal({
  open, onClose, onConfirm, title = 'Confirm',
  message, confirmText = 'Confirm', danger = false, loading, children
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      {children}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="sm"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
