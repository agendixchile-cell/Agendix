'use client'

import { useId, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityImage } from '@/components/ui/entity-image'
import {
  ACCEPTED_PROFILE_IMAGE_ACCEPT,
  ACCEPTED_PROFILE_IMAGE_LABEL,
  MAX_PROFILE_IMAGE_SIZE_LABEL,
  validateProfileImageFile,
} from '@/lib/images/config'
import { cn } from '@/lib/utils'

type ImageUploadFieldProps = {
  label: string
  description: string
  entityName: string
  imageUrl?: string | null
  previewUrl?: string | null
  variant: 'avatar' | 'logo'
  disabled?: boolean
  uploading?: boolean
  markedForRemoval?: boolean
  className?: string
  onFileSelect: (file: File) => void
  onRemove: () => void
  onRestore: () => void
}

export function ImageUploadField({
  label,
  description,
  entityName,
  imageUrl,
  previewUrl,
  variant,
  disabled,
  uploading,
  markedForRemoval,
  className,
  onFileSelect,
  onRemove,
  onRestore,
}: ImageUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')
  const visibleImageUrl = markedForRemoval ? null : previewUrl ?? imageUrl ?? null
  const hasStoredImage = Boolean(imageUrl)
  const hasDraft = Boolean(previewUrl || markedForRemoval)
  const mediaLabel = variant === 'avatar' ? 'foto' : 'imagen'

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const validationError = validateProfileImageFile(file)

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    onFileSelect(file)
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-slate-50/60 p-4',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <EntityImage
          src={visibleImageUrl}
          name={entityName}
          variant={variant}
          size="xl"
          className={variant === 'logo' ? 'bg-white' : undefined}
        />

        <div className="min-w-0 flex-1">
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {ACCEPTED_PROFILE_IMAGE_LABEL}, máximo {MAX_PROFILE_IMAGE_SIZE_LABEL}.
            </p>
          </div>

          {error && (
            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}

          {hasDraft && !error && (
            <p className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              El cambio se guardará al presionar el botón principal.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPTED_PROFILE_IMAGE_ACCEPT}
              className="sr-only"
              disabled={disabled || uploading}
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus size={14} aria-hidden="true" />
              {visibleImageUrl ? `Cambiar ${mediaLabel}` : `Subir ${mediaLabel}`}
            </Button>
            {(visibleImageUrl || hasStoredImage) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={onRemove}
              >
                <Trash2 size={14} aria-hidden="true" />
                Eliminar
              </Button>
            )}
            {hasDraft && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => {
                  setError('')
                  onRestore()
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Deshacer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
