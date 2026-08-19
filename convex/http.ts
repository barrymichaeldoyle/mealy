import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { readSvixHeaders, verifySvixSignature } from './lib/svix'

const http = httpRouter()

/**
 * Clerk tells us when an account is deleted. Without this the user goes from
 * Clerk and their household data stays in Convex, which would make the
 * deletion promise on /privacy untrue. It fires however the account was
 * deleted: from the Clerk dashboard, the Backend API, or the user themselves.
 */
http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env['CLERK_WEBHOOK_SECRET']
    if (!secret) {
      // Nothing can verify a delivery, so fail loudly rather than drop it.
      // Svix retries a 500, so the event survives until this is configured.
      console.error('CLERK_WEBHOOK_SECRET is not set on this deployment')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    const headers = readSvixHeaders(request.headers)
    if (!headers) {
      return new Response('Missing Svix headers', { status: 400 })
    }

    const body = await request.text()
    const verified = await verifySvixSignature({
      secret,
      headers,
      body,
      now: Date.now(),
    })
    if (!verified) {
      return new Response('Invalid signature', { status: 401 })
    }

    const userId = deletedUserId(parse(body))
    if (userId) {
      await ctx.runMutation(internal.households.deleteAccount, { userId })
    }

    // Anything else Clerk sends is acknowledged and ignored, so a webhook
    // configured with extra events does not pile up retries.
    return new Response(null, { status: 200 })
  }),
})

function parse(body: string): unknown {
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

/** The Clerk subject a `user.deleted` event names, or null for anything else. */
function deletedUserId(event: unknown): string | null {
  if (typeof event !== 'object' || event === null) {
    return null
  }
  const { type, data } = event as { type?: unknown; data?: unknown }
  if (type !== 'user.deleted' || typeof data !== 'object' || data === null) {
    return null
  }
  const { id } = data as { id?: unknown }
  return typeof id === 'string' ? id : null
}

export default http
