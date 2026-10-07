# Smart Sender frontend test

The current MVP covers the login and session flow; the webhook page is a placeholder.

## Run locally

npm install
npm run dev

## Demo account

- Email: user1@example.com
- Password: user1pass

## Login flow

- The app fetches a CSRF token before its first write request.
- Login sends the email, password, a persistent 32-character device fingerprint, and the mock CAPTCHA header.
- The temporary device_session_token is kept in memory and exchanged for a server-side session.
- The signed-in profile is kept in memory. Refreshing the page requires signing in again, as allowed by the assignment.
- Protected requests share one session-rotation request after 401 and retry once.
- Logout revokes the session and clears the local user state.

## Current scope

Implemented: login, session issue/rotation/revoke, protected /webhooks route, and a placeholder after login.

Next: webhook listing, URL-based search and pagination, and editing with server validation errors.