# Smart Sender frontend test

A small React + TypeScript app for signing in, viewing webhooks, and editing them. MSW provides a fake API during development.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

The test checks that two requests with an expired session share one session refresh and both succeed.

## Demo account

- Email: `user1@example.com`
- P## Key decisions

- **The app separates API requests, application state, and UI so each part has a clear role. MSW simulates the backend for the login, webhook list, and editing flows.

## Key decisions

- **Shared token rotation.** On a 401 the client calls `/auth/token/rotate` and retries the request once. Concurrent 401s share a single in-flight rotate promise, which is reset after it settles.
- **Session data.** `device_session_token` lives only in memory. The `fingerprint` (32 hex chars) is generated once and kept in localStorage. The client never sees session tokens, the mock plays the role of an HttpOnly cookie.
- **CSRF.** The token is fetched once before the first other request and sent on POST and PUT. On a 419 the token is refetched and the request retried once.
- **URL as the source of truth.** `page` and `search` live in the query string, so reload and back/forward work. Changing the search resets the page to 1.
- **Server validation errors.** 422 payloads are mapped to form fields via React Hook Form.
- **Layering.** Components never call `fetch` directly: API functions, auth state and TanStack Query hooks are separate from the UI.


## Project structure

### API logic

- [apiClient.ts](src/shared/api/apiClient.ts) sends requests, adds common headers and CSRF tokens, and retries once after renewing an expired session.
- [authApi.ts](src/features/auth/authApi.ts) contains the login and logout requests.
- [webhooksApi.ts](src/features/webhooks/webhooksApi.ts) contains the webhook list and update requests.

### State

- [AuthProvider.tsx](src/features/auth/AuthProvider.tsx) keeps the signed-in user and handles logout. [authContext.tsx](src/features/auth/authContext.tsx) lets components access that state.
- [WebhooksPage.tsx](src/features/webhooks/WebhooksPage.tsx) keeps the search and page number in the URL.
- TanStack Query loads and caches webhook data. After an edit, the list cache is refreshed.


### UI

- [App.tsx](src/App.tsx) defines the app routes. [main.tsx](src/main.tsx) starts the app and its providers.
- [LoginPage.tsx](src/features/auth/LoginPage.tsx) shows the login form. [RequireAuth.tsx](src/features/auth/RequireAuth.tsx) protects the webhook route.
- [WebhooksPage.tsx](src/features/webhooks/WebhooksPage.tsx) displays the list, search, and pagination.
- [WebhookEditForm.tsx](src/features/webhooks/WebhookEditForm.tsx) edits a webhook and shows server validation errors.
- React Hook Form manages the login and edit form fields.

Note: Signing in again after a page reload is expected because the mock session is stored in memory.
e mock session is stored in memory.
