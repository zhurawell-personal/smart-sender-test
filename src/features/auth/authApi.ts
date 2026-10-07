import { request } from '../../shared/api/apiClient.ts'
import { getFingerprint } from '../../shared/api/fingerprint.ts'
import type { UserProfile } from '../../shared/api/types.ts'

type LoginResponse = {
  device_session_token: string
}

// temporary token used only to create a session
let deviceSessionToken: string | null = null

// log in with email and password + headers
export async function signIn(email: string, password: string) {
  const fingerprint = getFingerprint()
  const loginResponse = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password, fingerprint },
    headers: { 'X-Captcha-Token': 'mock-captcha-token' }, // mandatory for login
    authenticated: false,
  })

  deviceSessionToken = loginResponse.device_session_token

  // exchange the temporary token for a session
  try {
    await request('/auth/token/issue', {
      method: 'POST',
      body: { device_session_token: deviceSessionToken, fingerprint },
      authenticated: false,
    })
  } finally {
    // clear the temporary token even if session creation fails
    deviceSessionToken = null
  }

  // load the user profile after session creation
  return request<UserProfile>('/v1/me')
}

export function signOut() {
  return request<void>('/auth/token/revoke', {
    method: 'POST',
    body: { fingerprint: getFingerprint() },
    authenticated: false,
  })
}
