import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handlers } from '../src/mocks/handlers.ts'
import { SESSION_TTL_MS, state } from '../src/mocks/db.ts'
import { request } from '../src/shared/api/apiClient.ts'
import type { UserProfile } from '../src/shared/api/types.ts'

const server = setupServer(...handlers)
const originalFetch = globalThis.fetch
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map<string, string>()

// set up browser-like storage and start api interception
before(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  })
  server.listen()
  // resolve relative api paths for the node interceptor
  const interceptedFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    const target =
      typeof input === 'string' && input.startsWith('/')
        ? new URL(input, 'http://localhost')
        : input
    return interceptedFetch(target, init)
  }
})

// restore globals and stop api interception
after(() => {
  globalThis.fetch = originalFetch
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
  server.close()
})

// check that simultaneous 401 responses reuse the same rotate request
test('parallel expired requests share one session rotation', async () => {
  let rotateCount = 0
  // make protected requests fail with 401
  state.sessionStarted = true
  state.expiresAt = Date.now() - 1

  // delay rotate so both requests can share the in-flight request
  server.use(
    http.post('*/auth/token/rotate', async () => {
      rotateCount += 1
      await delay(25)
      state.expiresAt = Date.now() + SESSION_TTL_MS
      return HttpResponse.json({})
    }),
  )

  // send both protected requests at the same time
  const profiles = await Promise.all([
    request<UserProfile>('/v1/me'),
    request<UserProfile>('/v1/me'),
  ])

  // both requests succeed and only one rotate reaches the server
  assert.deepEqual(
    profiles.map((profile) => profile.email),
    ['user1@example.com', 'user1@example.com'],
  )
  assert.equal(rotateCount, 1)
})