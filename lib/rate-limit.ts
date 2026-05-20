import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, Bucket>
type RateLimitClient = SupabaseClient<Database>

const globalRateLimitStore = globalThis as typeof globalThis & {
  __agendixRateLimitStore?: RateLimitStore
}

function store() {
  globalRateLimitStore.__agendixRateLimitStore ??= new Map()

  return globalRateLimitStore.__agendixRateLimitStore
}

export function hashRateLimitKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

function checkMemoryRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now = Date.now()
): RateLimitResult {
  const buckets = store()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: 0,
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
  supabase?: RateLimitClient | null
): Promise<RateLimitResult> {
  if (!supabase) {
    return checkMemoryRateLimit(key, options, now)
  }

  const { data, error } = await supabase
    .rpc('check_rate_limit', {
      p_key_hash: hashRateLimitKey(key),
      p_limit: options.limit,
      p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
      p_now: new Date(now).toISOString(),
    })
    .single()

  if (error || !data) {
    console.error('[rate-limit] persistent check failed', {
      code: error?.code,
      message: error?.message,
    })

    if (process.env.NODE_ENV === 'production') {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + 60_000,
        retryAfterSeconds: 60,
      }
    }

    return checkMemoryRateLimit(`fallback:${key}`, options, now)
  }

  const resetAt = new Date(data.reset_at).getTime()

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: Number.isNaN(resetAt) ? now + options.windowMs : resetAt,
    retryAfterSeconds: data.retry_after_seconds,
  }
}

export function resetRateLimitStoreForTests() {
  store().clear()
}
