export const CENTER_LOGOS_BUCKET = 'center-logos'
export const PROFESSIONAL_AVATARS_BUCKET = 'professional-avatars'

export const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
export const MAX_PROFILE_IMAGE_SIZE_LABEL = '2 MB'

export const ACCEPTED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const ACCEPTED_PROFILE_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const ACCEPTED_PROFILE_IMAGE_LABEL = 'JPG, PNG o WEBP'
const acceptedProfileImageTypes: readonly string[] = ACCEPTED_PROFILE_IMAGE_TYPES

type StoragePathOptions = {
  centroId: string
  entityId: string
  file: File
  folder: 'centers' | 'professionals'
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function validateProfileImageFile(file: File): string | null {
  if (!acceptedProfileImageTypes.includes(file.type)) {
    return `Usa una imagen ${ACCEPTED_PROFILE_IMAGE_LABEL}.`
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    return `La imagen no puede superar ${MAX_PROFILE_IMAGE_SIZE_LABEL}.`
  }

  return null
}

export function profileImageExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'

  return 'jpg'
}

export function buildProfileImageStoragePath({
  centroId,
  entityId,
  file,
  folder,
}: StoragePathOptions) {
  return `${centroId}/${folder}/${entityId}/${Date.now()}-${randomId()}.${profileImageExtension(file)}`
}

export function normalizePublicImageUrl(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

    return trimmed
  } catch {
    return null
  }
}

export function storagePathFromPublicUrl(
  publicUrl: string | null | undefined,
  bucket: string
) {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = url.pathname.indexOf(marker)

    if (markerIndex === -1) return null

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}
