import { http, HttpResponse } from 'msw'
import { CSRF_TOKEN, SESSION_TTL_MS, TEST_USER, state } from './db.ts'
import type { Webhook, WebhookList } from '../shared/api/types.ts'
// prefix the API path with a wildcard
const api = (path: string) => `*${path}`

// error response helper to standardize the error format
function apiError(
  status: number,
  type: string,
  message: string,
  payload?: Record<string, string[]>,
) {
  return HttpResponse.json(
    { error: { type, message, ...(payload && { payload }) } },
    { status },
  )
}

// guards for request validation
function requestHeaderGuard(request: Request) {
  return request.headers.get('X-Requested-With') === 'XMLHttpRequest'
    ? null
    : apiError(
        400,
        'BadRequestException',
        'The X-Requested-With header is required.',
      )
}

function csrfGuard(request: Request) {
  return request.headers.get('X-CSRF-TOKEN') === CSRF_TOKEN
    ? null
    : apiError(419, 'TokenMismatchException', 'CSRF token mismatch.')
}

// TODO: mock cookie-based sessions instead of relying on in-memory auth state
function authGuard() {
  return state.sessionStarted && Date.now() < state.expiresAt
    ? null
    : apiError(401, 'AuthenticationException', 'Unauthenticated.')
}

function fingerprintGuard(value: unknown) {
  return typeof value === 'string' && /^[a-f\d]{32}$/i.test(value)
    ? null
    : apiError(
        422,
        'ValidationException',
        'The given data was invalid.',
        {
          fingerprint: [
            'The fingerprint must be a 32-character hexadecimal string.',
          ],
        },
      )
}

function validateWebhook(body: { name: string; url: string }): Record<string, string[]> {
  const payload: Record<string, string[]> = {}
  if (!body.name.trim()) payload.name = ['The name field is required.']

  try {
    const url = new URL(body.url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    payload.url = ['The url must be a valid URL.']
  }

  return payload
}

// TODO: extract guards into a request pipeline to prevent duplication inside handlers
export const handlers = [
  http.get(api('/csrf'), ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied

    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
    })
  }),

  // validate credentials and return a temporary device session token
  http.post(api('/auth/login'), async ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const csrfDenied = csrfGuard(request)
    if (csrfDenied) return csrfDenied

    //mock captcha token only for the login endpoint
    if (!request.headers.get('X-Captcha-Token')) {
      return apiError(422, 'ValidationException', 'The given data was invalid.', {
        captcha: ['Captcha token is required.'],
      })
    }

    const body = (await request.json()) as { email: string; password: string; fingerprint: string }
    const fingerprintDenied = fingerprintGuard(body.fingerprint)
    if (fingerprintDenied) return fingerprintDenied
    if (body.email !== TEST_USER.email || body.password !== TEST_USER.password) {
      return apiError(422, 'ValidationException', 'The given data was invalid.', {
        password: ['These credentials do not match our records.'],
      })
    }

    state.deviceToken = crypto.randomUUID()
    const response = {
      device_session_token: state.deviceToken,
    }
    return HttpResponse.json(response)
  }),

  // exchange the temporary device token for a server-side session
  http.post(api('/auth/token/issue'), async ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const csrfDenied = csrfGuard(request)
    if (csrfDenied) return csrfDenied

    const body = (await request.json()) as { device_session_token: string; fingerprint: string }
    const fingerprintDenied = fingerprintGuard(body.fingerprint)
    if (fingerprintDenied) return fingerprintDenied
    if (!state.deviceToken || body.device_session_token !== state.deviceToken) {
      return apiError(422, 'ValidationException', 'The given data was invalid.', {
        device_session_token: ['Invalid device session token.'],
      })
    }

    state.sessionStarted = true
    state.expiresAt = Date.now() + SESSION_TTL_MS
    return HttpResponse.json({})
  }),

  // extend the active session by another 30 seconds
  http.post(api('/auth/token/rotate'), async ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const csrfDenied = csrfGuard(request)
    if (csrfDenied) return csrfDenied

    const body = (await request.json()) as { fingerprint: string }
    const fingerprintDenied = fingerprintGuard(body.fingerprint)
    if (fingerprintDenied) return fingerprintDenied

    if (!state.sessionStarted) {
      return apiError(400, 'BadRequestException', 'No active session.')
    }

    state.expiresAt = Date.now() + SESSION_TTL_MS
    return HttpResponse.json({})
  }),

  // end the active server-side session
  http.post(api('/auth/token/revoke'), async ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const csrfDenied = csrfGuard(request)
    if (csrfDenied) return csrfDenied

    const body = (await request.json()) as { fingerprint: string }
    const fingerprintDenied = fingerprintGuard(body.fingerprint)
    if (fingerprintDenied) return fingerprintDenied

    state.sessionStarted = false
    state.expiresAt = 0
    state.deviceToken = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('/v1/me'), ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const authDenied = authGuard()
    if (authDenied) return authDenied

    // exclude password from the response
    const { password: _password, ...me } = TEST_USER
    return HttpResponse.json(me)
  }),

  // webhooks CRUD endpoints
  http.get(api('/v1/webhooks'), ({ request }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const authDenied = authGuard()
    if (authDenied) return authDenied

    const params = new URL(request.url).searchParams
    const page = Math.max(1, Number(params.get('page')) || 1)
    const limit = Number(params.get('limit')) || 10
    const search = (params.get('search') ?? '').toLowerCase()
    const filtered = state.webhooks.filter((webhook) =>
      webhook.name.toLowerCase().includes(search),
    )
    const data = filtered.slice((page - 1) * limit, page * limit)

    const response: WebhookList = {
      data,
      paging: {
        pages: {
          current: page,
          last: Math.max(1, Math.ceil(filtered.length / limit)),
        },
        results: { total: filtered.length, limitation: limit },
      },
    }
    return HttpResponse.json(response)
  }),

  http.get(api('/v1/webhooks/:id'), ({ request, params }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const authDenied = authGuard()
    if (authDenied) return authDenied

    const webhook = state.webhooks.find((item) => item.id === Number(params.id))
    return webhook
      ? HttpResponse.json<Webhook>(webhook)
      : apiError(404, 'NotFoundException', 'Webhook not found.')
  }),

  http.put(api('/v1/webhooks/:id'), async ({ request, params }) => {
    const headerDenied = requestHeaderGuard(request)
    if (headerDenied) return headerDenied
    const csrfDenied = csrfGuard(request)
    if (csrfDenied) return csrfDenied
    const authDenied = authGuard()
    if (authDenied) return authDenied

    const webhook = state.webhooks.find((item) => item.id === Number(params.id))
    if (!webhook) return apiError(404, 'NotFoundException', 'Webhook not found.')

    const body = (await request.json()) as { name: string; url: string }
    const payload = validateWebhook(body)
    if (Object.keys(payload).length > 0) {
      return apiError(422, 'ValidationException', 'The given data was invalid.', payload)
    }

    webhook.name = body.name.trim()
    webhook.url = body.url
    return HttpResponse.json<Webhook>(webhook)
  }),
]
