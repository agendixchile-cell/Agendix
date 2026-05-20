'use client'

import { useState } from 'react'
import { Building2, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

type EntityImageVariant = 'avatar' | 'logo'
type EntityImageSize = 'sm' | 'md' | 'lg' | 'xl'

type EntityImageProps = {
  src?: string | null
  name: string
  variant?: EntityImageVariant
  size?: EntityImageSize
  className?: string
  imageClassName?: string
}

const sizeClasses: Record<EntityImageSize, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const logoSizeClasses: Record<EntityImageSize, string> = {
  sm: 'h-10 w-12 text-xs',
  md: 'h-12 w-16 text-sm',
  lg: 'h-16 w-24 text-base',
  xl: 'h-24 w-32 text-xl',
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function EntityImage({
  src,
  name,
  variant = 'avatar',
  size = 'md',
  className,
  imageClassName,
}: EntityImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const hasImage = Boolean(src && failedSrc !== src)
  const isLogo = variant === 'logo'

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden font-bold ring-1',
        isLogo
          ? 'rounded-xl bg-white text-slate-400 ring-slate-200/80'
          : 'rounded-full bg-orange-50 text-orange-600 ring-orange-200/70',
        isLogo ? logoSizeClasses[size] : sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt=""
          className={cn(
            'h-full w-full',
            isLogo ? 'object-contain p-1.5' : 'object-cover',
            imageClassName
          )}
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : isLogo ? (
        <Building2 size={size === 'xl' ? 30 : 20} aria-hidden="true" />
      ) : (
        initials(name) || (
          <UserRound size={size === 'xl' ? 30 : 20} aria-hidden="true" />
        )
      )}
    </span>
  )
}
