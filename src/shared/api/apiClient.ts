import { getFingerprint } from './fingerprint.ts'
import type { FieldErrors } from './types.ts'

// helper for making API requests with CSRF and session handling
// other parts of the app should use request() instead of fetch() directly

// what can be passed to request()
type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  authenticated?: boolean
}

// which errors can be thrown by request()
type ErrorResponseBody = {
  error?: {
    type?: string
    message?: string
    payload?: FieldErrors
  }
}

// extend the built-in Error class to include status and field errors
export class ApiError extends Error {
  readonly status: number
  readonly type: string
  readonly fieldErrors: FieldErrors

  constructor(
    message: string,
    status: number,
    type: string,
    fieldErrors: FieldErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.fieldErrors = fieldErrors
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.')
    this.name = 'SessionExpiredError'
  }
}

// shared state for api requests
const REQUESTED_WITH = 'XMLHttpRequest'
let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null // to avoid multiple concurrent CSRF requests
let rotateRequest: Promise<void> | null = null // to avoid multiple concurrent session rotations

// callback to notify the app when the session has expired, called when the session cannot be rotated
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

// fetch the csrf token once and reuse it
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken // return the cached token if available
  if (csrfRequest) return csrfRequest // return the ongoing request if one is in progress

  csrfRequest = (async () => {
    const response = await fetch('/csrf', {
      headers: { 'X-Requested-With': REQUESTED_WITH },
      credentials: 'include', // for cookies, not used with MSW
    })

    if (!response.ok) {
      throw await createApiError(response)
    }

    const token = response.headers.get('X-CSRF-TOKEN')
    if (!token) throw new Error('The CSRF endpoint did not return a token.')

    csrfToken = token
    return token
  })().finally(() => {
    csrfRequest = null // clear promise so that future requests can create a new one
  })

  return csrfRequest
}


// convert the api error response into a client-side error
async function createApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorResponseBody | null

  // body may never be null, but if it is, we still want to create an ApiError with the status code and a generic message
  const error = body?.error ?? {}

  return new ApiError(
    error.message ?? 'Request failed with status ' + response.status + '.',
    response.status,
    error.type ?? 'ApiError',
    error.payload ?? {},
  )
}

// share one session refresh when requests fail together
function rotateSession(): Promise<void> {
  if (!rotateRequest) { // if no rotation is in progress, start one
    rotateRequest = request('/auth/token/rotate', {
      method: 'POST',
      body: { fingerprint: getFingerprint() },
      authenticated: false,
    })
      .then(() => undefined)
      .finally(() => {
        rotateRequest = null // clear
      })
  }

  return rotateRequest
}

// send the request and handle csrf or session retries
async function performRequest<T>(
  path: string,
  options: ApiRequestOptions,
  retryAuth: boolean,
  retryCsrf: boolean,
): Promise<T> {
  const method = options.method ?? 'GET'
  const changesData = method === 'POST' || method === 'PUT'
  const headers = new Headers(options.headers)

  headers.set('X-Requested-With', REQUESTED_WITH)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  // add CSRF token if the request changes data
  if (changesData) {
    headers.set('X-CSRF-TOKEN', await getCsrfToken())
  }

  const response = await fetch(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
  })

  // get new CSRF token and retry the request if the token has expired
  if (response.status === 419 && retryCsrf && changesData) {
    csrfToken = null
    await getCsrfToken()
    return performRequest<T>(path, options, retryAuth, false) // retry only once, false passed
  }

  // if the session has expired, try to rotate it and retry the request
  if (response.status === 401 && options.authenticated !== false) {
    if (retryAuth) {
      try {
        await rotateSession()
      } catch {
        onSessionExpired?.()
        throw new SessionExpiredError()
      }

      return performRequest<T>(path, options, false, retryCsrf) // retry only once, false passed
    }

    onSessionExpired?.()
    throw new SessionExpiredError()
  }

  if (!response.ok) throw await createApiError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

// public entry point used by features to make api calls
export function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return performRequest<T>(path, options, true, true)
}