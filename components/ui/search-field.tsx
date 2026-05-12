import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
  inputClassName?: string
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
  inputClassName,
}: SearchFieldProps) {
  return (
    <label className={cn('relative block w-full', className)}>
      <span className="sr-only">{label}</span>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn('agendix-input', inputClassName)}
        style={{ paddingLeft: '2.5rem' }}
        aria-label={label}
      />
    </label>
  )
}
