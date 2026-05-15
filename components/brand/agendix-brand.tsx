import Image from 'next/image'
import { cn } from '@/lib/utils'

type AgendixBrandProps = {
  subtitle?: string
  compact?: boolean
  className?: string
  textClassName?: string
}

type AgendixWordmarkProps = {
  className?: string
  priority?: boolean
  preload?: boolean
}

export function AgendixWordmark({
  className,
  priority = false,
  preload = false,
}: AgendixWordmarkProps) {
  return (
    <div
      className={cn(
        'relative h-20 w-72 overflow-hidden bg-transparent sm:h-24 sm:w-80',
        className
      )}
    >
      <Image
        src="/agendix-wordmark.png"
        alt="Agendix"
        fill
        preload={preload || priority}
        sizes="(min-width: 640px) 320px, 288px"
        className="object-contain"
      />
    </div>
  )
}

export function AgendixBrand({
  subtitle,
  compact = false,
  className,
  textClassName,
}: AgendixBrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <AgendixSymbol size={compact ? 'sm' : 'md'} />
      <div className="min-w-0">
        <span
          className={cn(
            'block font-bold tracking-tight',
            compact ? 'text-base leading-5' : 'text-lg leading-6',
            textClassName ?? 'text-slate-800'
          )}
        >
          Agendix
        </span>
        {subtitle && (
          <span
            className={cn(
              'block truncate text-xs font-medium',
              textClassName ? 'opacity-60' : 'text-slate-500'
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

export function AgendixSymbol({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80',
        sizes[size],
        className
      )}
    >
      <AgendixLogoMark />
    </span>
  )
}

/** SVG inline del símbolo Agendix — A con figura de persona sentada */
function AgendixLogoMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Estructura A — dos trazos diagonales que convergen en el ápice */}
      <polyline
        points="10,88 50,9 90,88"
        stroke="#F9735B"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cabeza — círculo central */}
      <circle cx="50" cy="40" r="7" fill="#F9735B" />
      {/* Cuerpo — V que representa persona sentada */}
      <polyline
        points="33,63 50,77 67,63"
        stroke="#F9735B"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
