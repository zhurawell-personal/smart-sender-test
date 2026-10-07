import { Navigate, Route, Routes } from 'react-router'
import LoginPage from './features/auth/LoginPage.tsx'
import RequireAuth from './features/auth/RequireAuth.tsx'
import WebhooksPage from './features/webhooks/WebhooksPage.tsx'

// used react-router for simplicity
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/webhooks" element={<WebhooksPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
