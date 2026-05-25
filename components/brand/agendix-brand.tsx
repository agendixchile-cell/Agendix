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
  preload?: boolean
}

export function AgendixWordmark({
  className,
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
        src="/agendix-wordmark-transparent.png"
        alt="Agendix"
        fill
        preload={preload}
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
    <Image
      src="/agendix-symbol.svg"
      alt=""
      width={56}
      height={56}
      className={cn(
        'shrink-0 object-contain',
        sizes[size],
        className
      )}
    />
  )
}
