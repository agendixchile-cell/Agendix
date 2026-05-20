import { cn } from '@/lib/utils'

type UsageMeterProps = {
  label: string
  value: number
  limit: number | null
  helper?: string
  tone?: 'orange' | 'green' | 'blue' | 'red'
}

const toneClasses = {
  orange: 'bg-orange-500',
  green: 'bg-emerald-500',
  blue: 'bg-sky-500',
  red: 'bg-red-500',
}

export function UsageMeter({
  label,
  value,
  limit,
  helper,
  tone = 'orange',
}: UsageMeterProps) {
  const unlimited = limit === null
  const percentage = unlimited || limit === 0 ? 100 : Math.min(100, (value / limit) * 100)
  const displayLimit = unlimited ? 'Ilimitado' : limit
  const critical = !unlimited && percentage >= 90

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {helper && <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>}
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {value} / {displayLimit}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            critical ? toneClasses.red : toneClasses[tone]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
