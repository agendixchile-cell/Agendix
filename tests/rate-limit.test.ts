import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkRateLimit,
  hashRateLimitKey,
  resetRateLimitStoreForTests,
} from '@/lib/rate-limit'

describe('rate limit helper', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
  })

  it('allows requests inside the configured window', async () => {
    expect(
      (
        await checkRateLimit(
          'booking:ip:127.0.0.1',
          { limit: 2, windowMs: 60_000 },
          1_000
        )
      )
        .allowed
    ).toBe(true)
    expect(
      (
        await checkRateLimit(
          'booking:ip:127.0.0.1',
          { limit: 2, windowMs: 60_000 },
          2_000
        )
      )
        .allowed
    ).toBe(true)
  })

  it('blocks after the limit and reports retry-after seconds', async () => {
    await checkRateLimit(
      'booking:contact:test',
      { limit: 1, windowMs: 60_000 },
      1_000
    )
    const blocked = await checkRateLimit(
      'booking:contact:test',
      { limit: 1, windowMs: 60_000 },
      2_000
    )

    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(59)
  })

  it('resets after the window expires', async () => {
    await checkRateLimit(
      'booking:contact:test',
      { limit: 1, windowMs: 10_000 },
      1_000
    )

    expect(
      (
        await checkRateLimit(
          'booking:contact:test',
          { limit: 1, windowMs: 10_000 },
          11_001
        )
      )
        .allowed
    ).toBe(true)
  })

  it('hashes bucket keys before persistent storage', () => {
    const hash = hashRateLimitKey('booking:contact:test@example.com:+56912345678')

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain('test@example.com')
  })
})
