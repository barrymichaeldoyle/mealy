import { describe, expect, test } from 'vitest'
import {
  readSvixHeaders,
  timestampInTolerance,
  verifySvixSignature,
} from '../svix'

/**
 * Svix's own documented example. The signature was produced by their
 * reference implementation, so it pins our HMAC against something we did not
 * compute ourselves.
 */
const VECTOR = {
  secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
  id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  timestamp: '1614265330',
  body: '{"test": 2432232314}',
  signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
}

/** Inside the tolerance window around the vector's own timestamp. */
const NOW = 1614265330 * 1000

function headers(overrides: Partial<typeof VECTOR> = {}) {
  const merged = { ...VECTOR, ...overrides }
  return {
    id: merged.id,
    timestamp: merged.timestamp,
    signature: merged.signature,
  }
}

function verify(overrides: Partial<typeof VECTOR> = {}, now = NOW) {
  const merged = { ...VECTOR, ...overrides }
  return verifySvixSignature({
    secret: merged.secret,
    headers: headers(overrides),
    body: merged.body,
    now,
  })
}

describe('verifySvixSignature', () => {
  test('accepts the reference vector', async () => {
    await expect(verify()).resolves.toBe(true)
  })

  test('accepts a signature listed alongside another', async () => {
    await expect(
      verify({ signature: `v1,wrongsignature= ${VECTOR.signature}` }),
    ).resolves.toBe(true)
  })

  test('rejects a body that changed by one character', async () => {
    await expect(verify({ body: '{"test": 2432232315}' })).resolves.toBe(false)
  })

  test('rejects a different signing secret', async () => {
    await expect(
      verify({ secret: 'whsec_TfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw' }),
    ).resolves.toBe(false)
  })

  test('rejects a replayed id or timestamp', async () => {
    await expect(verify({ id: 'msg_someoneElse' })).resolves.toBe(false)
    await expect(verify({ timestamp: '1614265331' })).resolves.toBe(false)
  })

  test('rejects an unknown signature version', async () => {
    const [, value] = VECTOR.signature.split(',')
    await expect(verify({ signature: `v2,${value}` })).resolves.toBe(false)
  })

  test('rejects a delivery older than the tolerance window', async () => {
    await expect(verify({}, NOW + 6 * 60 * 1000)).resolves.toBe(false)
    await expect(verify({}, NOW - 6 * 60 * 1000)).resolves.toBe(false)
  })

  test('rejects a malformed secret rather than throwing', async () => {
    await expect(verify({ secret: 'whsec_' })).resolves.toBe(false)
    await expect(verify({ secret: 'whsec_not base64!' })).resolves.toBe(false)
  })

  test('rejects a signature header with no version separator', async () => {
    await expect(verify({ signature: 'garbage' })).resolves.toBe(false)
  })
})

describe('timestampInTolerance', () => {
  test('accepts the edges of the window and rejects past them', () => {
    expect(timestampInTolerance('1614265330', NOW + 5 * 60 * 1000)).toBe(true)
    expect(timestampInTolerance('1614265330', NOW + 5 * 60 * 1000 + 1)).toBe(
      false,
    )
  })

  test('rejects a timestamp that is not a number', () => {
    expect(timestampInTolerance('not-a-time', NOW)).toBe(false)
    expect(timestampInTolerance('', NOW)).toBe(false)
  })
})

describe('readSvixHeaders', () => {
  test('reads all three headers', () => {
    const found = readSvixHeaders(
      new Headers({
        'svix-id': VECTOR.id,
        'svix-timestamp': VECTOR.timestamp,
        'svix-signature': VECTOR.signature,
      }),
    )
    expect(found).toEqual(headers())
  })

  test('returns null when any header is missing', () => {
    expect(
      readSvixHeaders(
        new Headers({
          'svix-id': VECTOR.id,
          'svix-timestamp': VECTOR.timestamp,
        }),
      ),
    ).toBeNull()
    expect(readSvixHeaders(new Headers())).toBeNull()
  })
})
