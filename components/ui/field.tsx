type FieldProps = {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {hint && (
          <span aria-hidden="true" className="ml-1.5 text-xs font-normal text-slate-400">
            {hint}
          </span>
        )}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-500">
          {error}
        </span>
      )}
    </label>
  )
}
