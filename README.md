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
- Password: `user1pass`

The app separates API requests, application state, and UI so each part has a clear role. MSW simulates the backend for the login, webhook list, and editing flows.

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

### Mock API

- [browser.ts](src/mocks/browser.ts) starts MSW in the browser.
- [handlers.ts](src/mocks/handlers.ts) defines mock API endpoints and their responses. [db.ts](src/mocks/db.ts) stores mock webhooks and session state.

### Automated test

- [mock-api.test.ts](tests/mock-api.test.ts) checks that parallel expired requests share one session refresh.

Note: Signing in again after a page reload is expected because the mock session is stored in memory.
