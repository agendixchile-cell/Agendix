import { X } from 'lucide-react'

type FormModalProps = {
  title: string
  description: string
  children: React.ReactNode
  onClose: () => void
}

export function FormModal({
  title,
  description,
  children,
  onClose,
}: FormModalProps) {
  return (
    <div className="agendix-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="agendix-modal-panel max-h-[92vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/12">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 bg-[#FAFAF8] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold leading-6 text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar formulario"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-88px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
