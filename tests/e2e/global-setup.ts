import { clerkSetup } from '@clerk/testing/playwright'
import { createTestUser } from './clerk-user'

/**
 * Exchanges the Clerk keys for a testing token, then makes the throwaway
 * account this run signs in as. Workers are forked after this, so they
 * inherit the address through the environment.
 */
export default async function globalSetup() {
  await clerkSetup()
  const { id, email } = await createTestUser()
  process.env['E2E_CLERK_USER'] = email
  process.env['E2E_CLERK_USER_ID'] = id
}
