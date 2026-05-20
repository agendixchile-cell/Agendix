'use client'

import { createClient } from '@/lib/supabase/client'

type UploadPublicImageOptions = {
  bucket: string
  path: string
  file: File
}

export type UploadedPublicImage = {
  bucket: string
  path: string
  publicUrl: string
}

function uploadErrorMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? ''

  if (normalized.includes('row-level security') || normalized.includes('permission')) {
    return 'No tienes permisos para subir esta imagen.'
  }

  if (normalized.includes('mime') || normalized.includes('content type')) {
    return 'El formato de la imagen no está permitido.'
  }

  if (normalized.includes('size') || normalized.includes('too large')) {
    return 'La imagen supera el tamaño máximo permitido.'
  }

  return 'No pudimos subir la imagen. Intenta nuevamente.'
}

export async function uploadPublicImage({
  bucket,
  path,
  file,
}: UploadPublicImageOptions): Promise<UploadedPublicImage> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw new Error(uploadErrorMessage(error.message))
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return { bucket, path, publicUrl }
}

export async function removeUploadedPublicImage(image: UploadedPublicImage) {
  const supabase = createClient()
  await supabase.storage.from(image.bucket).remove([image.path])
}

export function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No pudimos leer la imagen.'))
    reader.readAsDataURL(file)
  })
}
