import type { Webhook } from '../shared/api/types.ts'

export const CSRF_TOKEN = 'mock-csrf-token' // to simulate CSRF protection
export const SESSION_TTL_MS = 30_000

// data to simulate login
export const TEST_USER = {
  id: 1,
  email: 'user1@example.com',
  password: 'user1pass',
  first_name: 'Test',
  last_name: 'User',
  name: 'Test User',
}

// fn to create a list of mock webhooks
function createWebhooks(): Webhook[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Webhook #${i + 1}`,
    url: `https://example.com/hooks/${i + 1}`,
    active: i % 3 !== 0, // every 3rd is inactive for testing
    created_at: new Date(2026, 0, 1 + i).toISOString(),
  }))
}

// simulate server-side session and data
export const state = {
  webhooks: createWebhooks(),
  deviceToken: null as string | null, // issued after login
  sessionStarted: false, // true after issue, false after revoke
  expiresAt: 0, // current session expiration time (ms)
}
