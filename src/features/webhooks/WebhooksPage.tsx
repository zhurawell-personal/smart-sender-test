import { useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext.tsx'

function WebhooksPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Signed in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Welcome, {user?.name}. The webhook list will come later.
      </p>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-sm"
      >
        Sign out
      </button>
    </main>
  )
}

export default WebhooksPage
