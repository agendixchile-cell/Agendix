import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FeedbackMessage = {
  type: 'success' | 'error' | 'warning'
  message: string
}

type FeedbackBannerProps = {
  feedback: FeedbackMessage
  onClose?: () => void
}

const config = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    role: 'status' as const,
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-200/80 bg-red-50 text-red-800',
    role: 'alert' as const,
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200/80 bg-amber-50 text-amber-800',
    role: 'alert' as const,
  },
}

export function FeedbackBanner({ feedback, onClose }: FeedbackBannerProps) {
  const { icon: Icon, className, role } = config[feedback.type]

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
        className
      )}
      role={role}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{feedback.message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 opacity-60 transition hover:opacity-100"
          aria-label="Cerrar mensaje"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
