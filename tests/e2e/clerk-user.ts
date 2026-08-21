const API = 'https://api.clerk.com/v1/users'

function secret(): string {
  const key = process.env['CLERK_SECRET_KEY']
  if (!key) {
    throw new Error('CLERK_SECRET_KEY is not set')
  }
  return key
}

/**
 * A throwaway account for one run. Clerk reserves `+clerk_test` addresses
 * for automation, so nothing is ever emailed and the sign-in code is fixed.
 *
 * A fresh user means a fresh household, which is the only way to see the
 * measurement setup screen: it shows once and never again.
 */
export async function createTestUser(): Promise<{ id: string; email: string }> {
  const email = `mealy+clerk_test_${Date.now()}@example.com`
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: 'Testy',
      // Required at creation even though this instance signs in by email
      // code, so the value is never used to authenticate.
      password: `pw-${crypto.randomUUID()}`,
      skip_password_checks: true,
      // The instance has legal consent switched on, so sign-up demands this.
      legal_accepted_at: new Date().toISOString(),
    }),
  })

  const body = (await response.json()) as { id?: string; errors?: unknown }
  if (!response.ok || !body.id) {
    throw new Error(
      `Clerk rejected the test user: ${JSON.stringify(body.errors)}`,
    )
  }
  return { id: body.id, email }
}

export async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${API}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret()}` },
  })
}
