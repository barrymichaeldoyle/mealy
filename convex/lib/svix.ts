/**
 * Svix signature verification, which is what Clerk signs its webhooks with.
 *
 * Hand-rolled against Web Crypto on purpose. The `svix` package needs Node
 * built-ins, and a Convex file using those has to be an action, which would
 * turn one HTTP handler into an action plus a mutation and a hop between
 * runtimes. The scheme itself is small: HMAC-SHA256 over
 * `${id}.${timestamp}.${body}`, keyed by the base64 body of the `whsec_`
 * secret, compared against the base64 signatures in the header.
 */

/** How far out of step a delivery's clock may be before we reject it. */
const TOLERANCE_MS = 5 * 60 * 1000

const SECRET_PREFIX = 'whsec_'

export type SvixHeaders = {
  id: string
  timestamp: string
  signature: string
}

/** The three headers every Svix delivery carries, or null if any is absent. */
export function readSvixHeaders(headers: Headers): SvixHeaders | null {
  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signature = headers.get('svix-signature')
  if (!id || !timestamp || !signature) {
    return null
  }
  return { id, timestamp, signature }
}

/**
 * A valid signature on a very old delivery is still a replay, so the
 * timestamp is checked separately and first.
 */
export function timestampInTolerance(timestamp: string, now: number): boolean {
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds)) {
    return false
  }
  return Math.abs(now - seconds * 1000) <= TOLERANCE_MS
}

export async function verifySvixSignature(args: {
  secret: string
  headers: SvixHeaders
  body: string
  now: number
}): Promise<boolean> {
  const { secret, headers, body, now } = args

  if (!timestampInTolerance(headers.timestamp, now)) {
    return false
  }

  const key = await importSecret(secret)
  if (!key) {
    return false
  }

  const signed = new TextEncoder().encode(
    `${headers.id}.${headers.timestamp}.${body}`,
  )
  const expected = base64Encode(await crypto.subtle.sign('HMAC', key, signed))

  // The header holds a space-delimited list of `version,signature` pairs, so
  // one delivery can carry two signatures while a secret is being rotated.
  return headers.signature.split(' ').some((entry) => {
    const separator = entry.indexOf(',')
    if (separator === -1) {
      return false
    }
    return (
      entry.slice(0, separator) === 'v1' &&
      timingSafeEqual(entry.slice(separator + 1), expected)
    )
  })
}

async function importSecret(secret: string): Promise<CryptoKey | null> {
  const encoded = secret.startsWith(SECRET_PREFIX)
    ? secret.slice(SECRET_PREFIX.length)
    : secret

  let raw: Uint8Array<ArrayBuffer>
  try {
    raw = base64Decode(encoded)
  } catch {
    return null
  }
  if (raw.length === 0) {
    return null
  }

  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function base64Decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  // The explicit ArrayBuffer keeps this a BufferSource crypto.subtle accepts,
  // rather than the SharedArrayBuffer-inclusive default.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function base64Encode(buffer: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** Compare without leaking where two signatures start to differ. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}
