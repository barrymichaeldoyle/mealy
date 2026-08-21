import { deleteTestUser } from './clerk-user'

/** The run's throwaway account goes with it. */
export default async function globalTeardown() {
  const id = process.env['E2E_CLERK_USER_ID']
  if (id) {
    await deleteTestUser(id)
  }
}
