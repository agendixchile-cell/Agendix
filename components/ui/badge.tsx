import { cn } from '@/lib/utils'

type BadgeProps = {
  children: React.ReactNode
  tone?: 'orange' | 'green' | 'blue' | 'violet' | 'slate' | 'red'
  className?: string
}

const tones = {
  orange: 'border-orange-200/80 bg-orange-50 text-orange-700',
  green: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  blue: 'border-sky-200/80 bg-sky-50 text-sky-700',
  violet: 'border-violet-200/80 bg-violet-50 text-violet-700',
  slate: 'border-slate-200/80 bg-slate-50 text-slate-600',
  red: 'border-red-200/80 bg-red-50 text-red-600',
}

export function Badge({ children, tone = 'slate', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
