export type MeetingProvider = 'zoom' | 'google_meet' | 'other'

export type MeetingPayload =
  | {
      meeting_url: string
      meeting_provider: MeetingProvider
      auto_generated_meeting: boolean
    }
  | {
      meeting_url: null
      meeting_provider: null
      auto_generated_meeting: boolean
    }

export function detectMeetingProvider(url: string): MeetingProvider | null {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const hostname = parsed.hostname.toLowerCase()

  if (hostname === 'meet.google.com') return 'google_meet'
  if (hostname === 'zoom.us' || hostname.endsWith('.zoom.us')) return 'zoom'

  return null
}

export function toMeetingPayload(value: string | null | undefined): MeetingPayload {
  const trimmed = value?.trim()

  if (!trimmed) {
    return {
      meeting_url: null,
      meeting_provider: null,
      auto_generated_meeting: false,
    }
  }

  const provider = detectMeetingProvider(trimmed)

  return {
    meeting_url: trimmed,
    meeting_provider: provider ?? 'other',
    auto_generated_meeting: false,
  }
}

export function isSupportedManualMeetingUrl(value: string): boolean {
  return Boolean(detectMeetingProvider(value))
}
